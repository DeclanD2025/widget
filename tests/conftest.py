import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from manager_watch.db.models import Base


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    db_session = factory()
    yield db_session
    db_session.close()
