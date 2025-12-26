from murf import Murf
from config import settings


class MurfService:
    
    def __init__(self):
        self.client = Murf(
        api_key=settings.MURF_API_KEY
    )
    
    def generate_audio_url(self, text: str, voice_id: str = "en-IN-priya"):
        """ 
        Generates audio using Murf and returns the direct URL.
        We use the 'generate' method which returns a URL hosted by Murf.
        This avoids saving files locally and is very fast. 
        """

        try:

            # Generate audio (returns an object with audio_file URL)
            # We use MP3 as it is lightweight for Twilio to fetch
            audio_res = self.client.text_to_speech.generate(
                text=text,
                voice_id=voice_id,
                format="MP3",
                model="FALCON"
            )

            return audio_res.audio_file
        except Exception as e:
            print(f"MurfService Error: {e}")
            return None