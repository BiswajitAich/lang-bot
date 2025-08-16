import traceback
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from psycopg import DatabaseError
from pydantic import BaseModel, EmailStr
from app.db.models.user import (
    check_if_email_present,
    check_if_user_present,
    check_user_credentials,
    create_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class CheckUser(BaseModel):
    username: str


class CheckEmail(BaseModel):
    email: EmailStr


class CheckCredentials(BaseModel):
    username: str
    email: EmailStr
    password: str


class CreateUser(CheckCredentials):
    first_name: str | None = None
    last_name: str | None = None


class Response(BaseModel):
    success: bool
    message: str


class UserData(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None


class ResponseWithUserData(Response):
    user: Optional[UserData] = None


# --------------------------------------------------------------------


@router.post("/check-user")
async def check_user(req: CheckUser) -> Response:
    try:
        success = await check_if_user_present(req.username)
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
    if success:
        return Response(success=True, message="Username is already taken")
    else:
        return Response(success=False, message="Username is unique.")


@router.post("/check-email")
async def check_email(req: CheckEmail) -> Response:
    try:
        success = await check_if_email_present(req.email)
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to check-email: {str(e)}",
        )
    if success:
        return Response(success=True, message="Emali is already Present.")
    else:
        return Response(success=False, message="Email is not Present")


@router.post("/create-user")
async def create_new_user(req: CreateUser) -> Response:
    try:
        success = await create_user(
            req.username, req.email, req.password, req.first_name, req.last_name
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}",
        )
    if success:
        return Response(success=True, message="User created successfully.")
    else:
        return Response(success=False, message="User Creation Unsuccessful.")


@router.post("/check-user-credentials")
async def check_credentials(req: CheckCredentials) -> ResponseWithUserData:
    try:
        success, user_data = await check_user_credentials(
            req.username, req.email, req.password
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred. {e}",
        )
    except:
        traceback.print_exc() 
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to check-user-credentials.",
        )
    if success:
        return ResponseWithUserData(
            success=True, message="User credentials are valid", user=user_data
        )
    else:
        return ResponseWithUserData(
            success=False, message="User credentials are not valid", user=user_data
        )
