from langchain_core.messages import AIMessage

class AssistantMessage(AIMessage):
    def __init__(self, content: str, **kwargs):
        super().__init__(content=content, **kwargs)
        self.type = "assistant"
