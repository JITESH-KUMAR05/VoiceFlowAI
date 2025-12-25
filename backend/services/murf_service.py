import httpx
import uuid
import os 
import json
from config import Settings

class MurfService:

    def __init__(self):
        self.api_key = Settings.MURFAI_API_KEY
        self.url = 