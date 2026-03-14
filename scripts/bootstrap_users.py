"""
Bootstrap script to create initial users in the database.
Run this script from the root directory: python scripts/bootstrap_users.py
Or from scripts directory: python bootstrap_users.py
"""
import sys
from pathlib import Path

# Add backend to Python path
# If running from scripts folder, go up one level
script_dir = Path(__file__).parent
if script_dir.name == "scripts":
    backend_path = script_dir.parent / "backend"
else:
    backend_path = script_dir / "backend"

sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, UserRole
from app.auth import hash_password


def create_bootstrap_users():
    """Create bootstrap users if they don't already exist."""
    
    # Drop all tables and recreate with new schema (including username field)
    # print("Dropping old tables and creating new schema...")
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)
    # print("✓ Database schema created with username support\n")
    
    # Bootstrap users data
    users_data = [
        {
            "username": "tushar.dayma",
            "email": "tdayma858@gmail.com",
            "password": "test@123",
            "full_name": "Tushar Dayma",
            "role": UserRole.admin
        },
        {
            "username": "rushil.dhube",
            "email": "rushildhube@gmail.com",
            "password": "test@456",
            "full_name": "Rushil Dhube",
            "role": UserRole.admin
        },
        {
            "username": "prathamesh.chavan",
            "email": "prathamesh011official@gmail.com",
            "password": "test@789",
            "full_name": "Prathamesh Chavan",
            "role": UserRole.admin
        }
    ]
    
    db: Session = SessionLocal()
    try:
        created_count = 0
        skipped_count = 0
        
        for user_data in users_data:
            # Check if user already exists
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            
            if existing_user:
                print(f"⚠️  User already exists: {user_data['username']} ({user_data['email']})")
                skipped_count += 1
                continue
            
            # Create new user
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
                is_active=True
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            print(f"✓ Created user: {user_data['username']} - {user_data['full_name']} (Role: {user_data['role'].value})")
            created_count += 1
        
        print(f"\n{'='*60}")
        print(f"Bootstrap complete!")
        print(f"Created: {created_count} user(s)")
        print(f"Skipped: {skipped_count} user(s) (already existed)")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting bootstrap process...\n")
    create_bootstrap_users()
