"""
User ORM model with Role + Department enums for multi-dimensional access control.
"""

import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    GUEST = "guest"
    STUDENT = "student"
    STAFF = "staff"
    HOD = "hod"
    ADMIN = "admin"


class Department(str, enum.Enum):
    CSE = "CSE"
    ECE = "ECE"
    MECH = "MECH"
    CIVIL = "CIVIL"
    MBA = "MBA"
    ADMIN = "ADMIN"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum(UserRole, name="userrole", create_constraint=True, native_enum=True),
        default=UserRole.GUEST,
        nullable=False,
    )
    department: Mapped[str] = mapped_column(
        Enum(Department, name="department", create_constraint=True, native_enum=True),
        nullable=True,  # nullable for guest users
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role} dept={self.department}>"
