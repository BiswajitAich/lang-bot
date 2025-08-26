from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode
from ddgs import DDGS
import requests
from langsmith import traceable
from typing import Annotated


@tool("brave_search")
@traceable
def duckduckgo_search(
    query: Annotated[str, "Text search query"],
    safesearch: Annotated[str, "on/off/moderate"] = "moderate",
) -> str:
    """Search the web using DuckDuckGo and return top results."""
    try:
        with DDGS() as ddgs:
            results = []
            for r in ddgs.text(query, safesearch=safesearch, max_results=3):
                body = (r["body"][:200] + "...") if len(r["body"]) > 200 else r["body"]
                results.append(f"- {r['title']} ({r['href']})\n{body}")
        if not results:
            return "No results found."
        return "\n".join(results)
    except Exception as e:
        print(f"[duckduckgo_search] Error: {e}")
        return "⚠️ Web search failed. Please try again later."


tools = [duckduckgo_search]

tool_node = ToolNode(tools)
