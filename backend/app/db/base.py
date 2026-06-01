from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """The base class for all sqlalchemy ORM models.
       
       every moe in app/models/ will inherit from this class:
       class User(Base):
           __tablename__="users
           
           DeclarativeBase is the modern SQLAlchemy 2.0 way to define models.
           It replaces the older `declarative_base()` function.
    """
    pass