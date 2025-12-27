from simple_salesforce import Salesforce
from config import settings
import logging

class SalesforceService:
    def __init__(self):
        self.sf = None
        try:
            if settings.SALESFORCE_USERNAME:
                self.sf = Salesforce(
                    username=settings.SALESFORCE_USERNAME,
                    password=settings.SALESFORCE_PASSWORD,
                    security_token=settings.SALESFORCE_TOKEN,
                    domain=settings.SALESFORCE_DOMAIN
                )
                print("Salesforce Connected Successfully")
        except Exception as e:
            print(f"Salesforce Connection Failed: {e}")

    def sync_call_data(self, lead_data: dict, call_summary: dict, transcript: str):
        if not self.sf:
            return

        try:
            # 1. Find or Create Lead
            email = lead_data.get("lead_email")
            name = lead_data.get("lead_name", "Unknown Lead")
            last_name = name.split(" ")[-1] if " " in name else name
            
            lead_id = None
            
            # Search by Email
            if email:
                query = f"SELECT Id FROM Lead WHERE Email = '{email}' LIMIT 1"
                results = self.sf.query(query)
                if results['totalSize'] > 0:
                    lead_id = results['records'][0]['Id']
            
            # Create if not found
            if not lead_id:
                lead_record = {
                    'LastName': last_name,
                    'Company': lead_data.get("lead_company", "Unknown Company"),
                    'Email': email,
                    'Phone': lead_data.get("phone_number"),
                    'Description': f"Created by VoiceFlow AI Agent ({lead_data.get('agent_type')})"
                }
                result = self.sf.Lead.create(lead_record)
                lead_id = result['id']
                print(f"Created New Salesforce Lead: {lead_id}")
            else:
                print(f"Found Existing Salesforce Lead: {lead_id}")

            # 2. Log the Call (Task Object)
            sentiment = call_summary.get("sentiment_label", "Neutral")
            score = call_summary.get("sentiment_score", 5)
            
            task_record = {
                'WhoId': lead_id,  # Link to Lead
                'Subject': f"AI Call: {lead_data.get('agent_type')} - Sentiment: {sentiment}",
                'Status': 'Completed',
                'Priority': 'Normal' if score < 8 else 'High',
                'Description': (
                    f"Sentiment Score: {score}/10\n"
                    f"Language: {lead_data.get('language')}\n"
                    f"Voice: {lead_data.get('voice_id')}\n\n"
                    f"Summary: {call_summary.get('summary')}\n\n"
                    f"Transcript:\n{transcript[:3000]}..." # Truncate if too long
                )
            }
            
            self.sf.Task.create(task_record)
            print("Logged Call Activity in Salesforce")

        except Exception as e:
            print(f"Salesforce Sync Error: {e}")