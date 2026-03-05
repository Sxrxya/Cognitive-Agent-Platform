"""
Cognitive Agent Platform — SQLAlchemy Models (PostgreSQL)
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    api_key_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tasks = relationship("TaskRecord", back_populates="owner")

class TaskRecord(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, index=True) # UUID
    goal = Column(String, nullable=False)
    status = Column(String, index=True)
    priority = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="tasks")
    steps = relationship("StepRecord", back_populates="task")

class StepRecord(Base):
    __tablename__ = "task_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id"))
    step_number = Column(Integer)
    description = Column(String)
    tool_used = Column(String)
    status = Column(String)
    result = Column(String, nullable=True)
    
    task = relationship("TaskRecord", back_populates="steps")

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    
    id = Column(String, primary_key=True, index=True) # UUID matching Pinecone doc_id
    filename = Column(String)
    total_tokens = Column(Integer)
    chunks_created = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
