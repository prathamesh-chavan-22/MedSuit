"""
Quick script to check if users exist in the database and test authentication.
"""
import sys
from pathlib import Path

# Add backend to Python path
script_dir = Path(__file__).parent
backend_path = script_dir / "backend"
sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import User
from app.auth import verify_password, authenticate_user

def check_users():
    """Check what users exist in the database."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print("="*60)
        print("Users in Database")
        print("="*60)
        
        if not users:
            print("❌ No users found in database!")
            print("\nRun the bootstrap script first:")
            print("   python scripts\\bootstrap_users.py")
        else:
            print(f"\nFound {len(users)} user(s):\n")
            for user in users:
                print(f"  📧 Email: {user.email}")
                print(f"     Name: {user.full_name}")
                print(f"     Role: {user.role.value}")
                print(f"     Active: {user.is_active}")
                print(f"     ID: {user.id}")
                print()
        
        print("="*60)
        
        # Test authentication for the three bootstrap users
        if users:
            print("\nTesting Authentication")
            print("="*60)
            
            test_credentials = [
                ("tdayma858@gmail.com", "test@123"),
                ("rushildhube@gmail.com", "test@456"),
                ("prathamesh011official@gmail.com", "test@789"),
            ]
            
            for email, password in test_credentials:
                user = authenticate_user(db, email, password)
                if user:
                    print(f"✅ {email} - Authentication successful")
                else:
                    print(f"❌ {email} - Authentication failed")
                    # Check if user exists
                    existing = db.query(User).filter(User.email == email).first()
                    if existing:
                        print(f"   User exists but password doesn't match")
                    else:
                        print(f"   User doesn't exist in database")
            
            print("="*60)
        
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
