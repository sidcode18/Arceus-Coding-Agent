from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_async_session
from app.core.security import create_access_token, create_refresh_token, verify_password, get_password_hash, decode_token
from app.models.user import User
from app.core.deps import get_current_user
from app.core.token_blocklist import is_token_blocklisted, blocklist_token
from app.core.oauth import oauth
from app.core.config import settings
from jose import JWTError

router = APIRouter()

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_async_session)):
    normalized_username = form_data.username.lower()
    result = await db.execute(
        select(User).filter(
            or_(
                func.lower(User.email) == normalized_username,
                func.lower(User.username) == normalized_username
            )
        )
    )
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = str(user.id)
    access_token = create_access_token(data={"sub": user_id_str})
    refresh_token = create_refresh_token(data={"sub": user_id_str})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@router.post("/register", response_model=TokenResponse)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_async_session)):
    normalized_email = request.email.lower()
    normalized_username = request.username.lower()
    
    result = await db.execute(select(User).filter(func.lower(User.email) == normalized_email))
    user = result.scalars().first()
    
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=normalized_email,
        username=normalized_username,
        hashed_password=get_password_hash(request.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    user_id_str = str(new_user.id)
    access_token = create_access_token(data={"sub": user_id_str})
    refresh_token = create_refresh_token(data={"sub": user_id_str})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_async_session)):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        jti = payload.get("jti")
        if not jti or await is_token_blocklisted(jti):
            raise HTTPException(status_code=401, detail="Token has been revoked")
            
        user_id = payload.get("sub")
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
            
        # Optional token rotation: blocklist the old refresh token
        exp = payload.get("exp")
        if exp:
            expires_in = int(exp - datetime.utcnow().timestamp())
            if expires_in > 0:
                await blocklist_token(jti, expires_in)
                
        user_id_str = str(user.id)
        access_token = create_access_token(data={"sub": user_id_str})
        new_refresh_token = create_refresh_token(data={"sub": user_id_str})
        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout")
async def logout(request: RefreshTokenRequest):
    try:
        payload = decode_token(request.refresh_token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            expires_in = int(exp - datetime.utcnow().timestamp())
            if expires_in > 0:
                await blocklist_token(jti, expires_in)
        return {"msg": "Successfully logged out"}
    except JWTError:
        # If token is already invalid, no need to fail logout
        return {"msg": "Successfully logged out"}

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }

@router.get("/github/login")
async def github_login(request: Request):
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")
    redirect_uri = settings.github_oauth_callback_url
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/github/callback")
async def github_callback(request: Request, db: AsyncSession = Depends(get_async_session)):
    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

    resp = await oauth.github.get('user', token=token)
    profile = resp.json()

    # Sometimes emails are private, we need to fetch them explicitly
    emails_resp = await oauth.github.get('user/emails', token=token)
    emails = emails_resp.json()

    primary_email = None
    for email_info in emails:
        if email_info.get("primary") and email_info.get("verified"):
            primary_email = email_info.get("email")
            break
    if not primary_email and len(emails) > 0:
        primary_email = emails[0].get("email")

    if not primary_email:
        raise HTTPException(status_code=400, detail="Cannot find a valid email in GitHub profile")

    github_id = str(profile.get("id"))
    username = profile.get("login")
    access_token = token.get("access_token")

    # 1. Find user by github_id
    result = await db.execute(select(User).filter(User.github_id == github_id))
    user = result.scalars().first()

    if not user:
        # 2. Find user by email and link
        result = await db.execute(select(User).filter(func.lower(User.email) == primary_email.lower()))
        user = result.scalars().first()
        
        if user:
            user.github_id = github_id
            user.github_access_token = access_token
        else:
            # 3. Create new user
            user = User(
                email=primary_email.lower(),
                username=username.lower(),
                github_id=github_id,
                github_access_token=access_token,
                hashed_password=None,
                avatar_url=profile.get("avatar_url"),
                full_name=profile.get("name")
            )
            db.add(user)
    else:
        # Update token if changed
        user.github_access_token = access_token
        if profile.get("avatar_url"):
            user.avatar_url = profile.get("avatar_url")
            
    await db.commit()
    await db.refresh(user)

    user_id_str = str(user.id)
    jwt_access_token = create_access_token(data={"sub": user_id_str})
    jwt_refresh_token = create_refresh_token(data={"sub": user_id_str})
    
    frontend_url = settings.frontend_url
    redirect_url = f"{frontend_url}/login?access_token={jwt_access_token}&refresh_token={jwt_refresh_token}"
    return RedirectResponse(redirect_url)
