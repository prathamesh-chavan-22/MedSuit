"""
Test script for email configuration.
Run from root: python test_email.py
"""
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.email import email_service, EmailConfig


def test_email_configuration():
    """Test if email is properly configured."""
    print("="*60)
    print("Email Configuration Test")
    print("="*60)
    print()
    
    # Check configuration
    print("📋 Configuration Status:")
    print(f"   SMTP Host: {EmailConfig.SMTP_HOST}")
    print(f"   SMTP Port: {EmailConfig.SMTP_PORT}")
    print(f"   SMTP Username: {EmailConfig.SMTP_USERNAME}")
    print(f"   SMTP Password: {'*' * len(EmailConfig.SMTP_PASSWORD) if EmailConfig.SMTP_PASSWORD else '(not set)'}")
    print(f"   From Email: {EmailConfig.SMTP_FROM_EMAIL}")
    print(f"   From Name: {EmailConfig.SMTP_FROM_NAME}")
    print()
    
    if EmailConfig.is_configured():
        print("✅ Email is properly configured!")
        print()
        
        # Ask if user wants to send test email
        send_test = input("Would you like to send a test email? (y/n): ").strip().lower()
        
        if send_test == 'y':
            recipient = input("Enter recipient email address: ").strip()
            
            if recipient:
                print(f"\n📧 Sending test email to {recipient}...")
                
                success = email_service.send_email(
                    to_email=recipient,
                    subject="Test Email from Vitalis",
                    body="This is a test email from Vitalis Hospital Management System. If you received this, your email configuration is working correctly!",
                    html_body="""
                    <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #2563eb;">✅ Email Configuration Test</h2>
                        <p>This is a test email from <strong>Vitalis Hospital Management System</strong>.</p>
                        <p>If you received this, your email configuration is working correctly!</p>
                        <div style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
                            <p style="margin: 0; color: #166534;">✓ SMTP Configuration: Working</p>
                            <p style="margin: 10px 0 0 0; color: #166534;">✓ Email Delivery: Successful</p>
                        </div>
                        <p style="margin-top: 20px; color: #666; font-size: 12px;">
                            Sent from Vitalis Email Service
                        </p>
                    </body>
                    </html>
                    """
                )
                
                if success:
                    print("✅ Test email sent successfully!")
                    print(f"   Check {recipient} inbox (and spam folder)")
                else:
                    print("❌ Failed to send test email. Check logs for details.")
            else:
                print("❌ No recipient email provided.")
        else:
            print("ℹ️  Test email not sent.")
    else:
        print("⚠️  Email is NOT configured!")
        print()
        print("To configure email:")
        print("1. Edit backend/.env file")
        print("2. Set SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL")
        print("3. For Gmail, generate an App Password at:")
        print("   https://myaccount.google.com/apppasswords")
        print()
        print("See EMAIL_SETUP.md for detailed instructions.")
    
    print()
    print("="*60)


def test_welcome_email():
    """Test welcome email template."""
    if not EmailConfig.is_configured():
        print("⚠️  Email not configured. Configure it first.")
        return
    
    recipient = input("Enter recipient email for welcome email test: ").strip()
    if recipient:
        print(f"\n📧 Sending welcome email to {recipient}...")
        success = email_service.send_welcome_email(recipient, "Test User")
        if success:
            print("✅ Welcome email sent!")
        else:
            print("❌ Failed to send welcome email.")


def test_alert_email():
    """Test alert notification email template."""
    if not EmailConfig.is_configured():
        print("⚠️  Email not configured. Configure it first.")
        return
    
    recipient = input("Enter recipient email for alert test: ").strip()
    if recipient:
        print(f"\n🚨 Sending alert email to {recipient}...")
        success = email_service.send_alert_notification(
            recipient,
            "John Doe",
            "critical",
            "Blood pressure critically high: 180/120 mmHg. Immediate attention required."
        )
        if success:
            print("✅ Alert email sent!")
        else:
            print("❌ Failed to send alert email.")


def main():
    """Main menu."""
    while True:
        print("\n" + "="*60)
        print("Vitalis Email Test Menu")
        print("="*60)
        print("1. Test email configuration")
        print("2. Send test welcome email")
        print("3. Send test alert email")
        print("4. Exit")
        print()
        
        choice = input("Select option (1-4): ").strip()
        
        if choice == "1":
            test_email_configuration()
        elif choice == "2":
            test_welcome_email()
        elif choice == "3":
            test_alert_email()
        elif choice == "4":
            print("\nGoodbye!")
            break
        else:
            print("❌ Invalid option. Please select 1-4.")


if __name__ == "__main__":
    print("\n🏥 Vitalis Email Testing Tool\n")
    main()
