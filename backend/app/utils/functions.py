from datetime import datetime
from app.utils.chatState import ChatState
from app.utils.llm import llm
from langchain_core.messages import SystemMessage
import traceback
from app.utils.types import AssistantMessage

def chat_node(state: ChatState):
    messages = state["messages"]
    llm_instruction = SystemMessage(
        content=(
            "System Instructions:\n"
            "- You are a chatbot created to help user through conversation.\n"
            "- Use tools as efficiently as possible as they are expensive.\n"
            "- After receiving a tool result, STOP using tools and finalize the answer.\n"
            "- Available tools: brave_search, generate_image (generate only one image at a time to give user, don't use it unless necessary).\n"
            "- Keep answers short and concise as passible.\n"
            "- If not sure about something ask user then give proper answer according to the chat history.\n"
            "- Do NOT ask users to confirm obvious facts like country or year unless their question is ambiguous.\n"
            "- Do not restate instructions or disclaimers — just answer directly, concisely, and confidently.\n"
            f"- Assume the current date and time is {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC)."
        )
    )
    try:
        response = llm.invoke([llm_instruction] + messages)
        return {"messages": [response]}
    except Exception as e:
        # Professional fallback
        traceback.print_exc()
        print(f"[chat_node] LLM invocation failed: {e}")
        return {"messages": [AssistantMessage(content="⚠️ Sorry, something went wrong. Please try again.")]}

