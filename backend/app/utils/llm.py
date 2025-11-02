import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from app.utils.tools import tools

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

llm_base = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.5, 
    groq_api_key=groq_api_key
    )
llm = llm_base.bind_tools(tools=tools, tool_choice="auto")
