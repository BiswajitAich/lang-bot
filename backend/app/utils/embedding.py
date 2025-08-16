# from functools import lru_cache
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from dotenv import load_dotenv
# import os

# load_dotenv()

# model_name = "gemini-embedding-001"


# @lru_cache()
# def get_emb():
#     return GoogleGenerativeAIEmbeddings(
#         model=model_name, google_api_key=os.getenv("GOOGLE_API_KEY")
#     )


# emb = get_emb()
