from murf import Murf, MurfRegion
from config import settings

class MurfService:
    
    def __init__(self):
        
        self.client = Murf(
            api_key=settings.MURF_API_KEY,
            region=MurfRegion.IN 
        )
    
    def create_audio_stream(self, text: str, voice_id: str):
        """ 
        Returns a generator that yields audio chunks directly from Murf (Falcon).
        No file saving = Ultra Low Latency.
        """
        try:
            print(f"Streaming audio for: {text[:20]}...")
            return self.client.text_to_speech.stream(
                text=text,
                voice_id=voice_id,
                model="FALCON",
                format="WAV",
                sample_rate=24000
            )
        except Exception as e:
            print(f"Murf Stream Error: {e}")
            return None