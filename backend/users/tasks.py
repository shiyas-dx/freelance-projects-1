import requests
from celery import shared_task
from django.conf import settings

@shared_task
def send_otp_email(email, otp):
    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": settings.BREVO_API_KEY
    }
    
    payload = {
        "sender": {
            "name": "LUXE", 
            # This now matches your verified Brevo sender exactly
            "email": "luxeshop692@gmail.com" 
        }, 
        "to": [{"email": email}],
        "subject": "Verify your LUXE Account",
        "htmlContent": f"""
            <html>
                <body style="font-family: sans-serif; text-align: center; color: #333;">
                    <div style="max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="text-transform: uppercase; font-style: italic; letter-spacing: -1px;">LUXE<span style="color: #ea580c;">.</span></h1>
                        <p style="font-size: 16px; font-weight: bold;">Verify Your Identity</p>
                        <p>Please use the following code to complete your registration:</p>
                        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h2 style="letter-spacing: 0.5em; font-size: 36px; margin: 0; color: #ea580c;">{otp}</h2>
                        </div>
                        <p style="font-size: 12px; color: #999;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
                </body>
            </html>
        """
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return f"Email sent successfully to {email}"
    except requests.exceptions.RequestException as e:
        print(f"Brevo API Error: {e}")
        return None