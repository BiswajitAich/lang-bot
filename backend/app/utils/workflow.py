# from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END

from app.utils.chatState import ChatState
from app.utils.functions import chat_node

# checkpointer = MemorySaver()
graph = StateGraph(ChatState)

graph.add_node('chat_node', chat_node)


graph.add_edge(START, 'chat_node')
graph.add_edge('chat_node', END)

workflow = graph.compile()