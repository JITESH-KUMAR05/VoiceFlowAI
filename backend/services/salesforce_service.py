from simple_salesforce import Salesforce
from config import settings
import time
from datetime import datetime

class SalesforceService:
    def __init__(self):
        self.connect()

    def connect(self):
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
            self.sf = None

    def sync_call_data(self, lead_data: dict, call_summary: dict, transcript: str):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if not self.sf: self.connect()
                if not self.sf: return

                email = lead_data.get("lead_email")
                full_name = lead_data.get("lead_name", "Unknown Lead").strip()
                
                if " " in full_name:
                    first_name = full_name.split(" ")[0]
                    last_name = " ".join(full_name.split(" ")[1:])
                else:
                    first_name = ""
                    last_name = full_name

                company = lead_data.get("lead_company", "Not Specified")
                
                # 1. Search Lead
                lead_id = None
                if email:
                    q = f"SELECT Id FROM Lead WHERE Email = '{email}' LIMIT 1"
                    res = self.sf.query(q)
                    if res['totalSize'] > 0:
                        lead_id = res['records'][0]['Id']
                
                # 2. Create Lead (if not found)
                if not lead_id:
                    lead_record = {
                        'FirstName': first_name,
                        'LastName': last_name,
                        'Company': company,
                        'Email': email,
                        'Phone': lead_data.get("phone_number"),
                        'LeadSource': 'VoiceFlow', 
                        'Description': f"Created by VoiceFlow AI Agent ({lead_data.get('agent_type')})"
                    }
                    res = self.sf.Lead.create(lead_record)
                    lead_id = res['id']

                # 3. UPDATE LEAD: Store Transcript, Score & Sentiment
                if lead_id:
                    # Score Logic
                    score_100 = call_summary.get("sentiment_score", 50)
                    
                    # Sentiment Logic
                    sentiment_picklist = "Neutral"
                    if score_100 >= 70: sentiment_picklist = "Interested"
                    elif score_100 >= 40: sentiment_picklist = "Neutral"
                    else: sentiment_picklist = "Not Interested"

                    # Transcript
                    safe_transcript = transcript if transcript else "No transcript available."
                    
                    try:
                        # [CRITICAL] Only update fields that exist and are safe
                        update_payload = {
                            'AI_Transcript__c': safe_transcript[:131000],
                            'AI_Lead_Score__c': score_100,
                            'AI_Sentiment__c': sentiment_picklist,
                            'Last_AI_Call__c': datetime.now().isoformat()
                        }
                        self.sf.Lead.update(lead_id, update_payload)
                        print(f"✅ Updated Lead {lead_id} with Transcript, Score ({score_100}), and Sentiment.")
                    except Exception as e:
                        print(f"⚠️ Failed to update Lead AI fields: {e}")

                    # 4. Log Task (Timeline Backup)
                    task_record = {
                        'WhoId': lead_id,
                        'Subject': f"AI Call: {lead_data.get('agent_type')} - Score: {score_100}/100",
                        'Status': 'Completed',
                        'Priority': 'High' if score_100 > 70 else 'Normal',
                        'Description': (
                            f"Intent Score: {score_100}/100\n"
                            f"Sentiment: {sentiment_picklist}\n"
                            f"Summary: {call_summary.get('summary')}\n\n"
                            f"--- Full Transcript ---\n{transcript[:3000]}"
                        )
                    }
                    self.sf.Task.create(task_record)
                    print(f"✅ Logged Call Activity for Lead: {lead_id}")
                
                break 

            except Exception as e:
                print(f"Salesforce Sync Attempt {attempt+1} Failed: {e}")
                self.connect()
                time.sleep(2)

    def get_crm_data(self, agent_type=None):
        if not self.sf:
            self.connect()
            if not self.sf: return []
        
        try:
            query = """
                SELECT Id, FirstName, LastName, Company, Email, Phone, Status, CreatedDate, Description, LeadSource,
                AI_Lead_Score__c, AI_Summary__c, AI_Sentiment__c, Last_AI_Call__c, AI_Transcript__c,
                Client_Company_Type__c, Client_Lifestyle__c, Key_Pain_Points__c, Agent_Conversion_Verdict__c,
                (SELECT Subject, Description, CreatedDate FROM Tasks ORDER BY CreatedDate DESC LIMIT 1)
                FROM Lead 
                ORDER BY CreatedDate DESC LIMIT 50
            """
            results = self.sf.query(query)
            
            mapped_data = []
            for record in results['records']:
                description = record.get('Description') or ""
                
                if "VoiceFlow" not in description and record.get('LeadSource') != 'VoiceFlow':
                    continue

                if agent_type and agent_type != "all":
                    normalized_type = agent_type.replace("-", "")
                    normalized_desc = description.replace("-", "").replace("_", "")
                    if normalized_type not in normalized_desc:
                        continue

                # Get Data
                score = record.get('AI_Lead_Score__c')
                sentiment = record.get('AI_Sentiment__c')
                summary = record.get('AI_Summary__c')
                last_contact = record.get('Last_AI_Call__c')
                transcript = record.get('AI_Transcript__c')
                
                # Qualitative Fields (Populated by Flow now, but we still fetch them)
                company_type = record.get('Client_Company_Type__c')
                lifestyle = record.get('Client_Lifestyle__c')
                pain_points = record.get('Key_Pain_Points__c')
                verdict = record.get('Agent_Conversion_Verdict__c')

                # Fallback Logic
                tasks = record.get('Tasks')
                last_task = tasks['records'][0] if tasks and tasks['records'] else {}
                
                if score is None and "Intent Score:" in last_task.get('Description', ''):
                    try:
                        score = int(last_task['Description'].split("Intent Score:")[1].split("/")[0].strip())
                    except: score = 0

                if not summary and last_task:
                    raw_desc = last_task.get('Description', '')
                    parts = raw_desc.split("--- Full Transcript ---")
                    summary = parts[0].replace(f"Intent Score: {score}/100", "").strip()
                    if not transcript and len(parts) > 1:
                        transcript = parts[1].strip()

                if not last_contact:
                    last_contact = last_task.get('CreatedDate', record['CreatedDate'])

                mapped_data.append({
                    "id": record['Id'],
                    "name": f"{record['FirstName'] or ''} {record['LastName']}".strip(),
                    "email": record['Email'],
                    "company": record['Company'],
                    "status": record['Status'],
                    "score": score or 0,
                    "sentiment": sentiment or "Neutral",
                    "last_contact": last_contact,
                    "summary": summary or "Processing...", # Summary might be empty initially if handled by Flow
                    "transcript": transcript or "No transcript available",
                    "company_type": company_type or "N/A",
                    "lifestyle": lifestyle or "N/A",
                    "pain_points": pain_points or "N/A",
                    "verdict": verdict or "Analysis pending"
                })
            
            return mapped_data
        except Exception as e:
            print(f"Error fetching CRM data: {e}")
            return []
