import traceback
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.utils.workflow import workflow
from pydantic import BaseModel

from app.utils.llm_models.funs import Message, create_thread_new, delete_conversation, get_conversations_from_table, insert_user_conversation
from app.utils.llm_models.threadfuns import get_thread_ids
from app.db.database import get_db_connection

router = APIRouter(prefix="/llm", tags=["LLM"])

class ThreadId(BaseModel):
    thread_id: str

class Response(BaseModel):
    success: bool
    message: str
    
class LLMRequest(ThreadId):
    user_input: str
    thread_id: str


class ConversationId(ThreadId):
    thread_id: str
    last_index: Optional[int] = 0


class NewThread(BaseModel):
    user_id: int
    init_msg: str


class ThreadCreatedResponse(Response):
    thread_id: Optional[str] = None


class GetThreadIds(BaseModel):
    user_id: int
    row_index: Optional[int] = None


class ResponseThreadIds(Response):
    thread_ids: List[str]


class ResponseConversation(Response):
    conversations: List[Message]


# ------------------------------------------------------


@router.post("/llm-initial-response")
def llm_initial_response(req: LLMRequest):
    return StreamingResponse(
        message_generator({"messages": {"role": "user", "content": req.user_input}}, req.thread_id),
        media_type="text/event-stream"
    )
    
    
    
@router.post("/continue-llm-response")
async def continue_llm_response(req: LLMRequest):
    conversationList = get_conversations_from_table(req.thread_id)
    conversationList.append({"role": "user", "content": req.user_input})
    insert_user_conversation(thread_id=req.thread_id, message=req.user_input)
    print(conversationList)
    return StreamingResponse(
        message_generator({"messages": conversationList}, req.thread_id),
        media_type="text/event-stream"
    )


@router.post("/new-thread")
def create_new_thread(req: NewThread) -> ThreadCreatedResponse:
    try:
        thread_id = create_thread_new(req.user_id, req.init_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create thread")
    return ThreadCreatedResponse(
        success=True, message="Thread created", thread_id=thread_id
    )


@router.post("/get-thread-ids")
def get_thread_ids_with_rowindex(req: GetThreadIds) -> ResponseThreadIds:
    try:
        print("/get-thread-ids", {'user_id': req.user_id, 'row_index':req.row_index})
        thread_ids = get_thread_ids(req.user_id, req.row_index)
        if not thread_ids:
            return ResponseThreadIds(
                success=False,
                message="Thread ids fetch unsuccessfull.",
                thread_ids=[],
            )
        return ResponseThreadIds(
            success=True,
            message="Thread ids successfully fetched.",
            thread_ids=thread_ids,
        )
    except Exception as e:
        print(f"Error in get_thread_ids_with_rowindex: {str(e)}") 
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail="Failed to get thread ids")


@router.post("/get-conversation")
def get_conversations(req: ConversationId) -> ResponseConversation:
    try:
        conversations = get_conversations_from_table(req.thread_id, req.last_index)

        if not conversations:
            return ResponseConversation(
                success=False,
                conversations=[],
                message="No conversation found for this thread_id."
            )

        return ResponseConversation(
            success=True,
            conversations=conversations,
            message="Successfully got all the conversation."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.post("/delete-conversation")
def delete_conversation_history(req: ThreadId) -> Response:
    try:
        success = delete_conversation(req.thread_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting conversation: {str(e)}")
    if success:
        return Response(
            success=True,
            message="Successfully deleted."
        )
    return Response(
        success=False,
        message="Unsuccessful attempt."
    )





# ----------------------------

def message_generator(initial_message, thread_id):
        llm_message = ""
        try:
            for message_chunk, metadata in workflow.stream(
                initial_message,
                stream_mode="messages",
            ):
                messages = message_chunk.content
                if messages:
                    msg:str = messages
                    llm_message += msg
                    yield msg
        except Exception as e:
            err_msg = f"Error: {str(e)}"
            print("Stream error:", err_msg)
            yield f"event: error\ndata: {err_msg}\n\n"
            return 
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO messages (thread_id, role, content) 
                        VALUES (%s, 'assistant', %s);
                        """,
                        (thread_id, llm_message.strip()),
                    )
                # conn.commit()
        except Exception as e:
            print("DB insert error:", e)