import base64
from io import BytesIO
import json
import os
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode
from ddgs import DDGS
import aiohttp
import cloudinary
import cloudinary.uploader
from langsmith import traceable
from typing import Annotated
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()
IMAGE_GENERATER_API = os.getenv("IMAGE_GENERATER_API")
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)


@tool("brave_search")
@traceable
def duckduckgo_search(
    query: Annotated[str, "Text search query"],
    # safesearch: Annotated[str, "on/off/moderate"] = "moderate",
) -> str:
    """Search the web using DuckDuckGo and return top results."""
    try:
        with DDGS() as ddgs:
            results = []
            for r in ddgs.text(query, max_results=3):
                results.append({
                    "title": r["title"],
                    "url": r["href"],
                    "snippet": r["body"][:200]
                })
        return json.dumps({"results": results})
    except Exception as e:
        print(f"[duckduckgo_search] Error: {e}")
        return json.dumps({"error": str(e)})


@tool("generate_image")
@traceable
async def generate_image(prompt: Annotated[str, "Prompt to generate image"]):
    """Generate an image using the deployed cloudflare Worker and after uploading in cloudinary returns {secure_url, public_id}."""
    try:
        prompt_encoded = quote(prompt)
        url = f"{IMAGE_GENERATER_API}?p={prompt_encoded}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"❌ Worker error: {error_text}")
                    return f"❌ Error: Worker returned status {resp.status}"

                # Check content type to determine response format
                content_type = resp.headers.get("Content-Type", "")

                if "image/" in content_type:
                    # Worker returns image directly
                    print(f"✅ Received image directly: {content_type}")
                    image_bytes = await resp.read()
                else:
                    # Worker returns JSON with base64 image
                    print(f"✅ Received JSON response")
                    data = await resp.json()
                    if "image" not in data:
                        print(f"❌ No image in response: {data}")
                        return "❌ Error: No image data received from worker"
                    image_bytes = base64.b64decode(data["image"])

        # Create BytesIO object from image bytes
        image_file = BytesIO(image_bytes)
        image_file.seek(0)  # Reset position to beginning

        # Upload to Cloudinary
        print(f"📤 Uploading to Cloudinary...")
        response = cloudinary.uploader.upload(
            image_file,
            folder="lang-bot",
            resource_type="image",
        )

        secure_url = response.get("secure_url")
        public_id = response.get("public_id")
        if not secure_url:
            print(f"❌ No secure_url in response: {response}")
            return "❌ Error: Failed to get secure_url from Cloudinary"

        print(f"✅ Image uploaded successfully: {secure_url}---{public_id}")
        return json.dumps({"secure_url": secure_url, "public_id": public_id})

    except Exception as e:
        import traceback

        print(f"❌ Error generating image: {e}")
        traceback.print_exc()
        return f"❌ Error generating image: {str(e)}"


tools = [duckduckgo_search, generate_image]
tool_node = ToolNode(tools)
