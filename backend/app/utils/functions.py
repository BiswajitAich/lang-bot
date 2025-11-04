from datetime import datetime
from app.utils.chatState import ChatState
from app.utils.llm import llm
from langchain_core.messages import SystemMessage
import traceback
from app.utils.types import AssistantMessage


def chat_node(state: ChatState):
    messages = state.get("messages", [])[-10:]
    llm_instruction = SystemMessage(
        content=(
            "You are a helpful, concise AI assistant that helps users through natural conversation.\n"
            "Guidelines:\n"
            "- Use tools (brave_search, generate_image) only when strictly necessary; tools are expensive.\n"
            "- After receiving any tool output, do NOT call another tool; instead finalize your response.\n"
            "- Keep answers as short and clear as possible — no filler or repetition.\n"
            "- If uncertain, ask for clarification before answering.\n"
            "- Do not restate instructions, disclaimers, or obvious facts.\n"
            f"- Assume the current date and time is {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC."
        )
    )
    try:
        response = llm.invoke([llm_instruction] + messages)
        return {"messages": response}
    except Exception as e:
        # Professional fallback
        traceback.print_exc()
        print(f"[chat_node] LLM invocation failed: {e}")
        return {
            "messages": [
                AssistantMessage(
                    content="⚠️ Sorry, something went wrong. Please try again."
                )
            ]
        }
