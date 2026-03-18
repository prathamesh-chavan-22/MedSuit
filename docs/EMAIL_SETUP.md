# Email Configuration Guide

## Overview
Vitalis has been configured to send emails using Google SMTP (Gmail). The email service is ready to use but currently not integrated into any endpoints.

## Email Service Features

The email service (`backend/app/email.py`) provides:

1. **Welcome Emails** - Send to new users when they register
2. **Alert Notifications** - Send critical/warning alerts to staff
3. **Task Reminders** - Remind staff about pending tasks
4. **Custom Emails** - Send any custom email with plain text and HTML

## Gmail Setup Instructions

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** section
3. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **Vitalis Hospital**
5. Click **Generate**
6. Copy the 16-character password (remove spaces)

### Step 3: Configure Environment Variables
Update `backend/.env` file with your credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Vitalis Hospital
```

## Usage Examples

### In Your Python Code

```python
from app.email import email_service

# Send a welcome email
email_service.send_welcome_email(
    to_email="user@example.com",
    user_name="Dr. Smith"
)

# Send an alert notification
email_service.send_alert_notification(
    to_email=["doctor@hospital.com", "nurse@hospital.com"],
    patient_name="John Doe",
    alert_type="critical",
    message="Blood pressure critically high: 180/120"
)

# Send a task reminder
email_service.send_task_reminder(
    to_email="nurse@hospital.com",
    user_name="Nurse Johnson",
    task_description="Administer medication to patient in Bed 5",
    patient_name="Jane Smith",
    due_time="2:00 PM"
)

# Send a custom email
email_service.send_email(
    to_email="recipient@example.com",
    subject="Custom Subject",
    body="Plain text body",
    html_body="<h1>HTML Body</h1><p>With formatting</p>"
)
```

## Integration Points (Not Yet Implemented)

Email notifications can be integrated into:

1. **User Registration** (`backend/app/routers/auth.py`)
   - Send welcome email when new user is created

2. **Alert Creation** (`backend/app/routers/alerts.py`)
   - Send email to assigned staff when critical alert is created

3. **Task Assignment** (`backend/app/routers/tasks.py`)
   - Send email when task is assigned to a user
   - Send reminder emails for overdue tasks

4. **Password Reset** (Future feature)
   - Send password reset links via email

## Testing

To test email configuration without modifying endpoints:

```python
# Run in Python shell from backend directory
from app.email import email_service

# Test basic email
email_service.send_email(
    to_email="your-test-email@gmail.com",
    subject="Test Email",
    body="This is a test email from Vitalis"
)
```

## Security Notes

- ✅ `.env` files are in `.gitignore` - credentials won't be committed
- ✅ Use App Passwords, not your Google account password
- ✅ App Passwords can be revoked at any time without affecting your account
- ⚠️ Never commit `.env` file to version control
- ⚠️ Keep your App Password secret

## Troubleshooting

### "Authentication failed" error
- Ensure 2FA is enabled on your Google account
- Verify you're using App Password, not regular password
- Check that SMTP_USERNAME matches the email that generated the App Password

### "Connection timeout" error
- Check your firewall settings
- Verify SMTP_PORT is 587 (for TLS) or 465 (for SSL)
- Ensure your network allows outbound connections to smtp.gmail.com

### Email not received
- Check spam/junk folder
- Verify recipient email address is correct
- Check Gmail's sent folder to confirm email was sent
- Review backend logs for any errors

## Alternative SMTP Providers

While configured for Gmail, you can use other providers by updating:

```env
# Microsoft Outlook/Office 365
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587

# Amazon SES
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
```

## Files Modified/Created

- ✅ `backend/.env` - Added SMTP configuration
- ✅ `backend/.env.example` - Added SMTP configuration template
- ✅ `backend/app/email.py` - Email service implementation
- ✅ `frontend/.env.example` - Created for reference
- ✅ `EMAIL_SETUP.md` - This documentation

## Next Steps

To start using email notifications:

1. Configure your Gmail credentials in `backend/.env`
2. Test the configuration using the testing example above
3. Integrate email calls into your endpoints as needed
4. Monitor email sending in production logs
