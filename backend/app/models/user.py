from sqlalchemy import Column, Integer, String
from app.db.databse import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    phone = Column(Integer , nullable=False)
    major = Column(String, nullable=True)
    role_id = Column(Integer, default=0)  # student, pr, manager, admin