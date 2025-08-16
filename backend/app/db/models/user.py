import bcrypt
import psycopg
from app.db.connection import get_pool


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_password.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# -----------------------------------------------------------------------


async def check_if_user_present(username: str) -> bool:
    try:
        pool = get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                            SELECT 1 FROM users 
                            WHERE username = %s
                            LIMIT 1;
                        """,
                    (username,),
                )
            return (await cur.fetchone()) is not None
    except psycopg.errors.ConnectionDoesNotExist:
        return False


async def check_if_email_present(email: str) -> bool:
    try:
        pool = get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                            SELECT 1 FROM users 
                            WHERE email = %s
                            LIMIT 1;
                        """,
                    (email,),
                )

            return (await cur.fetchone()) is not None
    except psycopg.errors.ConnectionDoesNotExist:
        return False


# print(check_if_user_present(""))


async def create_user(
    username: str,
    email: str,
    password: str,
    first_name: str | None,
    last_name: str | None,
) -> bool:
    try:
        hashed_pw = hash_password(password)
        pool = get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                        INSERT INTO users (
                        username, email, encoded_password, first_name, last_name
                        ) VALUES (
                        %s, %s, %s, %s, %s
                        ) RETURNING username;
                    """,
                    (username, email, hashed_pw, first_name, last_name),
                )
                created_user = await cur.fetchone()
            return created_user is not None
    except psycopg.errors.UniqueViolation:
        return False


async def check_user_credentials(username: str, email: str, password: str):
    try:
        pool = get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                            SELECT id, encoded_password, first_name, last_name FROM users 
                            WHERE username = %s
                            AND email = %s;
                        """,
                    (username, email),
                )
                result = await cur.fetchone()
            if result is None:
                return False, None
            id, encoded_password, first_name, last_name = result

            if verify_password(password, encoded_password):
                return True, {
                    "id": id,
                    "first_name": first_name,
                    "last_name": last_name,
                }
            else:
                return False, None
    except psycopg.errors.UniqueViolation:
        return False, None
