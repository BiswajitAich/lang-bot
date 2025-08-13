from typing import Optional
from fastapi import APIRouter, HTTPException, status
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
def check_user(req: CheckUser) -> Response:
    try:
        success = check_if_user_present(req.username)
        if success:
            return Response(success=True, message="Username is already taken")
        else:
            return Response(success=False, message="Username is unique.")
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user. Username or email might already exist.",
        )


@router.post("/check-email")
def check_email(req: CheckEmail) -> Response:
    try:
        success = check_if_email_present(req.email)
        if success:
            return Response(success=True, message="Emali is already Present.")
        else:
            return Response(success=False, message="Email is not Present")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to check-email: {str(e)}",
        )


@router.post("/create-user")
def create_new_user(req: CreateUser) -> Response:
    success = create_user(
        req.username, req.email, req.password, req.first_name, req.last_name
    )
    try:
        if success:
            return Response(success=True, message="User created successfully.")
        else:
            return Response(success=False, message="User Creation Unsuccessful.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}",
        )


@router.post("/check-user-credentials")
def check_credentials(req: CheckCredentials) -> ResponseWithUserData:
    try:
        success, user_data = check_user_credentials(
            req.username, req.email, req.password
        )
    except:
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
