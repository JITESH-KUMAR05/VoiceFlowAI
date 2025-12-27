import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

class EmailService:
    def send_followup(self, to_email: str, subject: str, email_body: str):
        if not settings.SMTP_USERNAME or not to_email:
            print("Skipping Email: Missing credentials or recipient.")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USERNAME
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(email_body, 'plain'))

            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            print(f"Follow-up email sent to {to_email}")

        except Exception as e:
            print(f"Email Error: {e}")