# Re-export Base so Alembic (env.py) can import from a single location.
from app.database.base import Base  # noqa: F401

# Import every model here so Alembic sees them at autogenerate time.
# Example (uncomment as you add models):
# from app.models.user import User         # noqa: F401
# from app.models.document import Document  # noqa: F401
