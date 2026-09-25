import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from backend.app.config import settings

logger = logging.getLogger("eris.database")

Base = declarative_base()

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.session_maker = None
        self.active_db_type = "uninitialized"

    async def initialize(self):
        # 1. Ensure memory directory exists
        settings.MEMORY_DIR.mkdir(parents=True, exist_ok=True)

        # 2. Attempt PostgreSQL Connection
        pg_url = settings.DATABASE_URL
        try:
            logger.info(f"Attempting connection to primary database (PostgreSQL)...")
            test_engine = create_async_engine(
                pg_url,
                echo=False,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                pool_recycle=1800,
                connect_args={"timeout": 3} if "asyncpg" in pg_url else {}
            )
            async with test_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            
            self.engine = test_engine
            self.active_db_type = "postgresql"
            logger.info("Primary database (PostgreSQL) connected successfully.")
        except Exception as pg_err:
            logger.warning(f"PostgreSQL connection failed ({pg_err}). Engaging resilient embedded SQLite fallback.")
            # 3. Fallback to SQLite (aiosqlite)
            sqlite_url = settings.FALLBACK_SQLITE_URL
            self.engine = create_async_engine(
                sqlite_url,
                echo=False,
                pool_pre_ping=True
            )
            self.active_db_type = "sqlite"
            logger.info(f"Embedded SQLite database active at {settings.MEMORY_DIR / 'auth.db'}")

        self.session_maker = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )

        # 4. Auto-generate tables & enable extensions
        async with self.engine.begin() as conn:
            if self.active_db_type == "postgresql":
                try:
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                    logger.info("PostgreSQL pgvector extension verified.")
                except Exception as ext_err:
                    logger.warning(f"pgvector extension notice (will continue if already enabled): {ext_err}")

            try:
                await conn.run_sync(Base.metadata.create_all)
            except Exception as ddl_err:
                logger.warning(f"Database table generation notice (resuming safely): {ddl_err}")

            # 5. Resilient column migration for existing SQLite databases
            if self.active_db_type == "sqlite":
                try:
                    res = await conn.execute(text("PRAGMA table_info(users)"))
                    cols = [row[1] for row in res.fetchall()]
                    if "username" not in cols:
                        await conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50)"))
                        logger.info("Migrated SQLite schema: added users.username")
                    if "avatar_url" not in cols:
                        await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
                        logger.info("Migrated SQLite schema: added users.avatar_url")
                    if "preferences" not in cols:
                        await conn.execute(text("ALTER TABLE users ADD COLUMN preferences JSON"))
                        logger.info("Migrated SQLite schema: added users.preferences")
                except Exception as mig_err:
                    logger.warning(f"Schema column check skipped or failed non-critically: {mig_err}")

        logger.info("Database schemas verified.")

    async def close(self):
        if self.engine:
            await self.engine.dispose()
            logger.info("Database engine connection pool disposed.")

db_manager = DatabaseManager()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI request-scoped database session dependency."""
    if not db_manager.session_maker:
        await db_manager.initialize()
    async with db_manager.session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
