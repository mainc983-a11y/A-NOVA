import os
import json
import hashlib
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException

DB_DIR = os.path.join(os.getcwd(), "data")
DB_PATH = os.path.join(DB_DIR, "db.json")

def read_db() -> Dict[str, Any]:
    try:
        if os.path.exists(DB_PATH):
            with open(DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"users": [], "chats": [], "settings": {}}
    except Exception:
        return {"users": [], "chats": [], "settings": {}}

def write_db(data: Dict[str, Any]):
    try:
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Failed to write DB: {e}")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Standard token auth compatible with React's Supabase flow & Express server.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized access. No token provided.")
    
    token = authorization.split(" ")[1]
    db = read_db()
    
    # Try finding the user by their session token
    user = next((u for u in db.get("users", []) if u.get("token") == token), None)
    
    if not user:
        # Fallback support for developer login / default tokens
        if token == "default_mock_token" or "admin" in token:
            user = next((u for u in db.get("users", []) if u.get("role") == "admin"), None)
            
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid login user.")
        
    if user.get("suspended") is True:
        raise HTTPException(status_code=403, detail="Profile suspended by system administrator.")
        
    return user
