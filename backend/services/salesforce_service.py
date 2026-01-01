from simple_salesforce import Salesforce
from config import settings
import time

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
                        'LeadSource': 'VoiceFlow', # [FIX] Use this for filtering
                        'Description': f"Created by VoiceFlow AI Agent ({lead_data.get('agent_type')})"
                    }
                    res = self.sf.Lead.create(lead_record)
                    lead_id = res['id']

                # 3. Log Task (Score & Summary)
                if lead_id:
                    raw_score = call_summary.get("sentiment_score", 5)
                    score_100 = raw_score * 10 
                    
                    task_record = {
                        'WhoId': lead_id,
                        'Subject': f"AI Call: {lead_data.get('agent_type')} - Score: {score_100}/100",
                        'Status': 'Completed',
                        'Priority': 'High' if score_100 > 70 else 'Normal',
                        'Description': (
                            f"Intent Score: {score_100}/100\n"
                            f"Summary: {call_summary.get('summary')}\n\n"
                            f"--- Full Transcript ---\n{transcript[:3000]}"
                        )
                    }
                    self.sf.Task.create(task_record)
                    print(f"Logged Call Activity in Salesforce for Lead: {lead_id}")
                
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
            # [FIX] Query Logic:
            # 1. We cannot filter 'Description' in SOQL.
            # 2. We fetch recent leads and filter in Python instead.
            query = """
                SELECT Id, FirstName, LastName, Company, Email, Phone, Status, CreatedDate, Description, LeadSource,
                (SELECT Subject, Description, CreatedDate FROM Tasks ORDER BY CreatedDate DESC LIMIT 1)
                FROM Lead 
                ORDER BY CreatedDate DESC LIMIT 50
            """
            results = self.sf.query(query)
            
            mapped_data = []
            for record in results['records']:
                description = record.get('Description') or ""
                
                # [FIX] Python Filtering
                # Only show leads created by VoiceFlow
                if "VoiceFlow" not in description and record.get('LeadSource') != 'VoiceFlow':
                    continue

                # Filter by Agent Type (b2b vs real-estate)
                if agent_type and agent_type != "all":
                    # Normalize: "real-estate" matches "real_estate" or "real-estate"
                    normalized_type = agent_type.replace("-", "")
                    normalized_desc = description.replace("-", "").replace("_", "")
                    
                    if normalized_type not in normalized_desc:
                        continue

                # Parse Task Data
                tasks = record.get('Tasks')
                last_call = tasks['records'][0] if tasks and tasks['records'] else {}
                task_desc = last_call.get('Description', '')
                
                score = 0
                if "Intent Score:" in task_desc:
                    try:
                        score = int(task_desc.split("Intent Score:")[1].split("/")[0].strip())
                    except: pass

                mapped_data.append({
                    "id": record['Id'],
                    "name": f"{record['FirstName'] or ''} {record['LastName']}".strip(),
                    "email": record['Email'],
                    "company": record['Company'],
                    "status": record['Status'],
                    "score": score,
                    "last_contact": last_call.get('CreatedDate', record['CreatedDate']),
                    "summary": task_desc.split("--- Full Transcript ---")[0].replace(f"Intent Score: {score}/100", "").strip() or "No call summary yet",
                })
            
            return mapped_data
        except Exception as e:
            print(f"Error fetching CRM data: {e}")
            return []