import time
import json
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
            start_time = time.time()
            response= await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=history,
                max_tokens=150,
                temperature=0.7,
            )
            duration = time.time() - start_time
            print(f"OpenAI Latency: {duration:.4f}s")
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAIService Error: {e}")
            return "I'm sorry, I'm having trouble generating a response right now."

    async def analyze_call(self, history: list, lead_name: str):
        """
        Analyzes the call and generates a personalized follow-up email.
        """
        try:
            # Convert history to a single string
            transcript = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history if msg['role'] != 'system'])
            
            prompt = (
                f"Analyze the following call transcript with {lead_name}.\n"
                "Return a JSON object with these fields:\n"
                "- sentiment_score: (1-10)\n"
                "- sentiment_label: (Interested, Neutral, Not Interested, Angry)\n"
                "- summary: (Brief summary for CRM)\n"
                "- email_body: (Write a warm, personalized follow-up email to the lead based on what was discussed. "
                "Address their specific questions or concerns mentioned. "
                "Do not include a subject line. Sign off as 'VoiceFlow AI Team'.)\n\n"
                f"Transcript:\n{transcript}"
            )

            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}, 
                temperature=0.7 # Slightly higher for creative email writing
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Analysis Error: {e}")
            return {
                "sentiment_score": 5,
                "sentiment_label": "Neutral",
                "summary": "Analysis failed.",
                "email_body": f"Hi {lead_name},\n\nThank you for speaking with us. We will be in touch shortly.\n\nBest,\nVoiceFlow Team"
            }