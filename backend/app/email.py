"""
Email utility module for sending emails via SMTP.
Configured to work with Google SMTP (Gmail).
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)


class EmailConfig:
    """Email configuration from environment variables."""
    
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Vitalis Hospital")
    
    @classmethod
    def is_configured(cls) -> bool:
        """Check if SMTP is properly configured."""
        return bool(cls.SMTP_USERNAME and cls.SMTP_PASSWORD and cls.SMTP_FROM_EMAIL)


class EmailService:
    """Service for sending emails via SMTP."""
    
    def __init__(self):
        self.config = EmailConfig()
    
    def send_email(
        self,
        to_email: str | List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email via SMTP.
        
        Args:
            to_email: Recipient email address(es)
            subject: Email subject
            body: Plain text email body
            html_body: Optional HTML email body
            cc: Optional CC recipients
            bcc: Optional BCC recipients
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.config.is_configured():
            logger.warning("SMTP not configured. Skipping email send.")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.config.SMTP_FROM_NAME} <{self.config.SMTP_FROM_EMAIL}>"
            
            # Handle recipient(s)
            if isinstance(to_email, str):
                to_email = [to_email]
            msg['To'] = ', '.join(to_email)
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            
            # Attach body parts
            msg.attach(MIMEText(body, 'plain'))
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Combine all recipients
            all_recipients = to_email.copy()
            if cc:
                all_recipients.extend(cc)
            if bcc:
                all_recipients.extend(bcc)
            
            # Send email
            with smtplib.SMTP(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD)
                server.send_message(msg, to_addrs=all_recipients)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """
        Send a welcome email to a new user.
        
        Args:
            to_email: User's email address
            user_name: User's full name
            
        Returns:
            True if email sent successfully
        """
        subject = "Welcome to Vitalis Hospital System"
        
        body = f"""
Hello {user_name},

Welcome to Vitalis Hospital Management System!

Your account has been created successfully. You can now log in to the system using your email address.

If you have any questions, please contact your system administrator.

Best regards,
Vitalis Team
        """
        
        html_body = f"""
<html>
<head></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to Vitalis Hospital System</h2>
        
        <p>Hello <strong>{user_name}</strong>,</p>
        
        <p>Welcome to Vitalis Hospital Management System!</p>
        
        <p>Your account has been created successfully. You can now log in to the system using your email address.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0;"><strong>Next steps:</strong></p>
            <ul style="margin: 10px 0;">
                <li>Log in to the system with your credentials</li>
                <li>Complete your profile information</li>
                <li>Familiarize yourself with the dashboard</li>
            </ul>
        </div>
        
        <p>If you have any questions, please contact your system administrator.</p>
        
        <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Vitalis Team</strong>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
            This is an automated message. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
        """
        
        return self.send_email(to_email, subject, body, html_body)
    
    def send_alert_notification(
        self,
        to_email: str | List[str],
        patient_name: str,
        alert_type: str,
        message: str
    ) -> bool:
        """
        Send an alert notification email.
        
        Args:
            to_email: Recipient email address(es)
            patient_name: Name of the patient
            alert_type: Type of alert (critical, warning, info)
            message: Alert message
            
        Returns:
            True if email sent successfully
        """
        subject = f"🚨 {alert_type.upper()} Alert: {patient_name}"
        
        body = f"""
MEDICAL ALERT

Patient: {patient_name}
Alert Type: {alert_type.upper()}

Message:
{message}

Please take immediate action if required.

This is an automated alert from Vitalis Hospital Management System.
        """
        
        html_body = f"""
<html>
<head></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ef4444; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0;">🚨 MEDICAL ALERT</h2>
        </div>
        
        <div style="padding: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>Patient:</strong> {patient_name}</p>
            <p style="margin: 10px 0 0 0;"><strong>Alert Type:</strong> <span style="text-transform: uppercase; color: #dc2626;">{alert_type}</span></p>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="margin: 10px 0 0 0;">{message}</p>
        </div>
        
        <div style="padding: 15px; background-color: #fff3cd; border-radius: 8px;">
            <p style="margin: 0; color: #856404;">⚠️ Please take immediate action if required.</p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
            This is an automated alert from Vitalis Hospital Management System.
        </p>
    </div>
</body>
</html>
        """
        
        return self.send_email(to_email, subject, body, html_body)
    
    def send_task_reminder(
        self,
        to_email: str,
        user_name: str,
        task_description: str,
        patient_name: str,
        due_time: str
    ) -> bool:
        """
        Send a task reminder email.
        
        Args:
            to_email: Recipient email address
            user_name: Name of the assigned user
            task_description: Description of the task
            patient_name: Patient name
            due_time: When the task is due
            
        Returns:
            True if email sent successfully
        """
        subject = f"Task Reminder: {task_description[:50]}"
        
        body = f"""
Hello {user_name},

This is a reminder about your assigned task:

Task: {task_description}
Patient: {patient_name}
Due: {due_time}

Please complete this task as soon as possible.

Best regards,
Vitalis Team
        """
        
        html_body = f"""
<html>
<head></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Task Reminder</h2>
        
        <p>Hello <strong>{user_name}</strong>,</p>
        
        <p>This is a reminder about your assigned task:</p>
        
        <div style="padding: 20px; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Task:</strong> {task_description}</p>
            <p style="margin: 0 0 10px 0;"><strong>Patient:</strong> {patient_name}</p>
            <p style="margin: 0;"><strong>Due:</strong> {due_time}</p>
        </div>
        
        <p style="color: #dc2626;">Please complete this task as soon as possible.</p>
        
        <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Vitalis Team</strong>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
            This is an automated reminder from Vitalis Hospital Management System.
        </p>
    </div>
</body>
</html>
        """
        
        return self.send_email(to_email, subject, body, html_body)


# Global email service instance
email_service = EmailService()
