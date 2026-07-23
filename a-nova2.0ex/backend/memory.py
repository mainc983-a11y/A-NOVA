import os
import json
import random
import string
from datetime import datetime
from typing import Dict, Any, List, Optional
from .auth import read_db, write_db

def load_all_chats(user_id: str) -> List[Dict[str, Any]]:
    db = read_db()
    chats = [c for c in db.get("chats", []) if c.get("userId") == user_id]
    # Sort descending by updatedAt
    chats.sort(key=lambda x: x.get("updatedAt", x.get("createdAt", "")), reverse=True)
    return chats

def load_chat_by_id(chat_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    db = read_db()
    for c in db.get("chats", []):
        if c.get("id") == chat_id and c.get("userId") == user_id:
            return c
    return None

def create_new_chat(user_id: str, mode: str = "general") -> Dict[str, Any]:
    db = read_db()
    chat_id = "chat_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    now = datetime.utcnow().isoformat() + "Z"
    
    new_chat = {
        "id": chat_id,
        "userId": user_id,
        "title": "New Conversation",
        "mode": mode,
        "selectedModel": "gemini-3.5-flash",
        "messages": [],
        "createdAt": now,
        "updatedAt": now
    }
    
    db.setdefault("chats", []).append(new_chat)
    write_db(db)
    return new_chat

def save_chat_message(chat_id: str, user_id: str, role: str, content: str, files: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    db = read_db()
    chats = db.get("chats", [])
    
    chat_obj = next((c for c in chats if c.get("id") == chat_id and c.get("userId") == user_id), None)
    if not chat_obj:
        return {}
        
    msg_id = "msg_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    now = datetime.utcnow().isoformat() + "Z"
    
    msg = {
        "id": msg_id,
        "role": role,
        "content": content,
        "timestamp": now,
        "attachedFiles": files or []
    }
    
    chat_obj.setdefault("messages", []).append(msg)
    chat_obj["updatedAt"] = now
    
    # Auto rename default convo titles
    if chat_obj.get("title") in ["New Conversation", "New Chat"] and role == "user":
        seed = content[:30] if content else "Attached File Analysis"
        chat_obj["title"] = seed + ("..." if len(seed) >= 30 else "")
        
    write_db(db)
    return msg
