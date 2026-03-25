import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import AsyncSessionLocal
from app.schemas.user import UserCreate
from app.services.user_service import UserService
from app.models.user import UserRole, Department

async def create_admin():
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        
        email = "admin@college.edu"
        password = "AdminPassword123!"
        
        # Check if admin already exists
        existing_user = await service.get_by_email(email)
        if existing_user:
            print(f"Admin user already exists with email: {email}")
            return

        payload = UserCreate(
            email=email,
            password=password,
            full_name="System Admin",
            role=UserRole.ADMIN,
            department=Department.ADMIN
        )
        
        try:
            admin_user = await service.create(payload)
            await db.commit()
            print(f"Successfully created admin user!")
            print(f"Email: {email}")
            print(f"Password: {password}")
        except Exception as e:
            await db.rollback()
            print(f"Error creating admin: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin())
