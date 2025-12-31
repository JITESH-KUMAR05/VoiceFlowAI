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
            print("Salesforce not connected")
            return

        try:
            # 1. Find or Create Lead
            email = lead_data.get("lead_email")
            name = lead_data.get("lead_name", "Unknown Lead")
            last_name = name.split(" ")[-1] if " " in name else name
            first_name = name.split(" ")[0] if " " in name else name
            
            # [FIX] Provide Company field (Required by Salesforce)
            company = lead_data.get("lead_company", "Not Specified")
            
            lead_id = None
            
            # Search by Email
            if email:
                try:
                    query = f"SELECT Id FROM Lead WHERE Email = '{email}' LIMIT 1"
                    results = self.sf.query(query)
                    if results['totalSize'] > 0:
                        lead_id = results['records'][0]['Id']
                        print(f"Found Existing Salesforce Lead: {lead_id}")
                except Exception as e:
                    print(f"Error querying lead: {e}")
            
            # Create if not found
            if not lead_id:
                lead_record = {
                    'FirstName': first_name,
                    'LastName': last_name,
                    'Company': company if company else "Unknown Company", 
                    'Email': email,
                    'Phone': lead_data.get("phone_number"),
                    'Description': f"Created by VoiceFlow AI Agent ({lead_data.get('agent_type')})"
                }
                try:
                    result = self.sf.Lead.create(lead_record)
                    lead_id = result['id']
                    print(f"Created New Salesforce Lead: {lead_id}")
                except Exception as e:
                    print(f"Error creating lead: {e}")
                    return

            # 2. Log the Call (Task Object)
            if lead_id:
                sentiment = call_summary.get("sentiment_label", "Neutral")
                score = call_summary.get("sentiment_score", 5)
                
                task_record = {
                    'WhoId': lead_id,
                    'Subject': f"AI Call: {lead_data.get('agent_type')} - Sentiment: {sentiment}",
                    'Status': 'Completed',
                    'Priority': 'Normal' if score < 8 else 'High',
                    'Description': (
                        f"Sentiment Score: {score}/10\n"
                        f"Language: {lead_data.get('language')}\n"
                        f"Voice: {lead_data.get('voice_id')}\n\n"
                        f"Summary: {call_summary.get('summary')}\n\n"
                        f"Transcript:\n{transcript[:3000]}..."
                    )
                }
                
                try:
                    self.sf.Task.create(task_record)
                    print(f"Logged Call Activity in Salesforce for Lead: {lead_id}")
                except Exception as e:
                    print(f"Error creating task: {e}")

        except Exception as e:
            print(f"Salesforce Sync Error: {e}")