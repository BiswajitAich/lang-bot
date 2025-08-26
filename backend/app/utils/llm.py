import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from app.utils.tools import tools

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.5, 
    groq_api_key=groq_api_key
    ).bind_tools(tools=tools)
