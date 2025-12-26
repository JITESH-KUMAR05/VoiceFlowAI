from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from config import settings

class TwilioService:
    def __init__(self):
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.from_phone_number = settings.TWILIO_PHONE_NUMBER
        self.base_url = settings.BASE_URL
    
    def initiate_call(self, to_number: str):
        """Initiates an outbound call using Twilio"""
        url = f"{self.base_url}/api/phone/twiml/start"
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_phone_number,
            url=url,
            method="POST"
        )

        return call.sid
    
    def create_response(self, audio_url: str):
        """Generates TwiML response for the call"""
        response = VoiceResponse()
        if(audio_url):
            response.play(audio_url)
        gather = response.gather(
            input="speech",
            action=f"{self.base_url}/api/phone/twiml/process",
            method="POST",
            language="en-IN",
            speech_timeout="auto"
        )
        response.say("I didn't hear anything. Goodbye.")
        return response.to_xml()