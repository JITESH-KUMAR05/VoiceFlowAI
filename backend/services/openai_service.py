from openai import AsyncAzureOpenAI
from config import settings

class OpenAIService:

    def __init__(self):
        self.client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        )
    
    async def generate_response(self, history: list):
        """ 
            Generates a text response based on conversation history format : [{"role": "system", "content": "...."}, {"role": "user" : "content": "...."}]
        """

        try:
            response= await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=history,
                max_tokens=150,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAIService Error: {e}")
            return "I'm sorry, I'm having trouble generating a response right now."