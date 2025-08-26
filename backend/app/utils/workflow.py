# from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END

from app.utils.chatState import ChatState
from app.utils.functions import chat_node
from app.utils.tools import tool_node
from langgraph.prebuilt import tools_condition

# checkpointer = MemorySaver()
graph = StateGraph(ChatState)

graph.add_node('chat_node', chat_node)
graph.add_node('tools', tool_node)


graph.add_edge(START, 'chat_node')
graph.add_conditional_edges('chat_node', tools_condition)
graph.add_edge('tools', 'chat_node')

workflow = graph.compile()