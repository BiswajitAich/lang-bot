from app.utils.chatState import ChatState
from app.utils.llm import llm
from langchain_core.messages import SystemMessage
import traceback
from app.utils.types import AssistantMessage

def chat_node(state: ChatState):
    messages = state["messages"]
    llm_instruction = SystemMessage(
        content=(
            "Instructions:\n"
            "- You are a chatbot created by Biswajit Aich.\n"
            "- Use tools as efficiently as possible.\n"
            "- NEVER call the same tool more than once per query.\n"
            "- After receiving a tool result, STOP using tools and finalize the answer.\n"
            "- Keep answers short and concise."
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

