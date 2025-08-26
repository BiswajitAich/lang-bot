import json
import traceback
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from psycopg import DatabaseError
from app.utils.workflow import workflow
from pydantic import BaseModel

# from app.utils.embedding import emb

from app.utils.llm_models.funs import (
    Message,
    create_thread_new,
    delete_conversation,
    get_conversations_from_table,
    insert_user_conversation,
)
from app.utils.llm_models.threadfuns import get_thread_ids
from app.db.connection import get_pool

router = APIRouter(prefix="/llm", tags=["LLM"])


class ThreadId(BaseModel):
    thread_id: str


class Response(BaseModel):
    success: bool
    message: str


class LLMRequest(ThreadId):
    user_input: str
    thread_id: str


class LLMRequestInitial(LLMRequest):
    parent_id: int


class ConversationId(ThreadId):
    thread_id: str
    last_index: Optional[int] = 0


class NewThread(BaseModel):
    user_id: int
    init_msg: str


class ThreadCreatedResponse(Response):
    thread_id: Optional[str] = None
    parent_id: Optional[int]


class GetThreadIds(BaseModel):
    user_id: int
    row_index: Optional[int] = None


class ResponseThreadIds(Response):
    thread_ids: List[str]


class ResponseConversation(Response):
    conversations: List[Message]


# ------------------------------------------------------


@router.post("/llm-initial-response")
def llm_initial_response(req: LLMRequestInitial):
    print("📄📄📄📄")
    return StreamingResponse(
        message_generator(
            {"messages": {"role": "user", "content": req.user_input}},
            req.thread_id,
            req.parent_id,
        ),
        media_type="text/event-stream",
    )


@router.post("/continue-llm-response")
async def continue_llm_response(req: LLMRequest):
    conversationList = await get_conversations_from_table(req.thread_id)
    conversationList.append({"role": "user", "content": req.user_input})
    parent_id = await insert_user_conversation(
        thread_id=req.thread_id, message=req.user_input
    )
    print(conversationList)
    if not parent_id:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get parent_id",
        )
    return StreamingResponse(
        message_generator(
            {"messages": conversationList}, req.thread_id, parent_id=parent_id
        ),
        media_type="text/event-stream",
    )


@router.post("/new-thread")
async def create_new_thread(req: NewThread) -> ThreadCreatedResponse:
    try:
        thread_id, parent_id, success = await create_thread_new(
            req.user_id, req.init_msg
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create thread")
    print(
        "🙏🏻",
        ThreadCreatedResponse(
            success=True,
            message="Thread created",
            thread_id=thread_id,
            parent_id=parent_id,
        ),
    )
    if success:
        return ThreadCreatedResponse(
            success=True,
            message="Thread created",
            thread_id=thread_id,
            parent_id=parent_id,
        )
    return ThreadCreatedResponse(
        success=False,
        message="Thread created",
        thread_id=thread_id,
        parent_id=parent_id,
    )


@router.post("/get-thread-ids")
async def get_thread_ids_with_rowindex(req: GetThreadIds) -> ResponseThreadIds:
    try:
        print("/get-thread-ids", {"user_id": req.user_id, "row_index": req.row_index})
        thread_ids = await get_thread_ids(req.user_id, req.row_index)
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        print(f"Error in get_thread_ids_with_rowindex: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get thread ids",
        )
    return ResponseThreadIds(
        success=True,
        message="Thread ids successfully fetched.",
        thread_ids=thread_ids,
    )


@router.post("/get-conversation")
async def get_conversations(req: ConversationId) -> ResponseConversation:
    try:
        conversations = await get_conversations_from_table(
            req.thread_id, req.last_index
        )
    except DatabaseError as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
    if not conversations:
        return ResponseConversation(
            success=False,
            conversations=[],
            message="No conversation found for this thread_id.",
        )

    return ResponseConversation(
        success=True,
        conversations=conversations,
        message="Successfully got all the conversation.",
    )


@router.post("/delete-conversation")
async def delete_conversation_history(req: ThreadId) -> Response:
    try:
        success = await delete_conversation(req.thread_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting conversation: {str(e)}",
        )
    if success:
        return Response(success=True, message="Successfully deleted.")
    return Response(success=False, message="Unsuccessful attempt.")


# ----------------------------


async def message_generator(initial_message: str, thread_id: str, parent_id: int):
    print("🎏🎏🎏")
    llm_message = ""
    tool_logs = []  # [(tool_name, tool_input, tool_output, tool_call_id)]
    message_to_insert = ""

    try:
        async for message_chunk, metadata in workflow.astream(
            initial_message,
            stream_mode="messages",
        ):
            if message_chunk.type == "AIMessageChunk" and getattr(
                message_chunk, "tool_calls", None
            ):
                for tool_call in message_chunk.tool_calls:
                    tool_name = tool_call["name"]
                    tool_input = tool_call.get("args", {})
                    tool_logs.append([tool_name, json.dumps(tool_input), None])
                    message_to_insert += f"[TOOL CALL] {tool_name} with ```{tool_input}``` [TOOL CALL END]\n\n"
                    yield f"[TOOL CALL] {tool_name} with ```{tool_input}``` [TOOL CALL END]\n\n".encode(
                        "utf-8"
                    )

            elif message_chunk.type == "tool":
                tool_name = message_chunk.name
                tool_output = message_chunk.content
                for log in tool_logs:
                    if log[0] == tool_name and log[2] is None:
                        log[2] = tool_output
                        break
                message_to_insert += f"[TOOL RESULT] {tool_name} => {tool_output[:200]}... [TOOL RESULT END]\n\n"
                yield f"[TOOL RESULT] {tool_name} => {tool_output[:200]}... [TOOL RESULT END]\n\n".encode(
                    "utf-8"
                )

            elif message_chunk.type == "AIMessageChunk":
                message = message_chunk.content
                if message:
                    llm_message += message
                    yield message.encode("utf-8")

    except Exception as e:
        traceback.print_exc()
        yield f"Error: {str(e)}".encode("utf-8")

    # --- Save into DB ---
    try:
        pool = get_pool()
        message_to_insert += llm_message
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                if message_to_insert.strip():
                    await cur.execute(
                        """
                            INSERT INTO messages (thread_id, parent_id, role, content) 
                            VALUES (%s, %s, 'assistant', %s);
                            """,
                        (thread_id, parent_id, message_to_insert.strip()),
                    )

                for tool_name, tool_input, tool_output in tool_logs:
                    if tool_output:
                        await cur.execute(
                            """
                                INSERT INTO tool_logs (message_id, tool_name, input, output)
                                VALUES (%s, %s, %s, %s);
                                """,
                            (parent_id, tool_name, tool_input, tool_output),
                        )
                # await cur.execute(
                #     """
                #         SELECT content FROM messages WHERE id=%s;
                #     """,
                #     (parent_id,),
                # )
                # row = await cur.fetchone()
                # user_message = row[0]
                # print({user_message: user_message, llm_message: llm_message})
                # embedding = await emb.aembed_query(
                #     f"user: {user_message}, assistant: {llm_message}"
                # )
                # print("🔍 Embedding type:", type(embedding))
                # await cur.execute(
                #     """
                #         INSERT INTO embedded_messages (message_id, embedding)
                #         VALUES (%s, %s);
                #     """,
                #     (parent_id, embedding),
                # )
                await conn.commit()
                # print("✅ Successfully inserted into database")
    except Exception as e:
        traceback.print_exc()
        print("DB insert error:", e)
