from murf import Murf, MurfRegion
from config import settings

class MurfService:
    
    def __init__(self):
        self.client = Murf(
            api_key=settings.MURF_API_KEY,
            region=MurfRegion.IN,
            timeout=60
        )
    
    def create_audio_stream(self, text: str, voice_id: str, language: str = "en-US"):
        """ 
        Returns a generator that yields audio chunks directly from Murf (Falcon).
        """
        # [FIX] Extract Voice Name (e.g., "en-US-josie" -> "Josie")
        if "-" in voice_id:
            clean_voice_id = voice_id.split("-")[-1].capitalize()
        else:
            clean_voice_id = voice_id

        try:
            print(f"Streaming audio... Voice: {clean_voice_id}, Lang: {language}")
            
            return self.client.text_to_speech.stream(
                text=text,
                voice_id=clean_voice_id, 
                model="FALCON",
                multi_native_locale=language, 
                format="WAV",
                sample_rate=24000
            )
        except Exception as e:
            print(f"Murf Stream Error: {e}")
            return None