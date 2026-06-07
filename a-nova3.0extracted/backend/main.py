import os
import json
import base64
import random
import string
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Header, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auth import verify_token, read_db, write_db, hash_password
from .ai import generate_ai_response
from .search import perform_web_search
from .memory import load_all_chats, load_chat_by_id, create_new_chat, save_chat_message

# Initialize FastAPI app
app = FastAPI(
    title="A-NOVA Python backend API Engine",
    description="Full-stack FastAPI backend implementation including Gemini AI integrations, multi-modal file support, and secure auth.",
    version="2.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PYDANTIC MODEL SCHEMAS ---

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    mode: Optional[str] = "general"
    files: Optional[List[Dict[str, Any]]] = []
    web_search: Optional[bool] = False

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class UploadRequest(BaseModel):
    filename: str
    type: str
    base64: str

# Legacy payload compatibility schemas
class ResolvePhonePayload(BaseModel):
    phone: str

class SmsOtpPayload(BaseModel):
    phone: str
    isRegistration: Optional[bool] = False

class VerifySmsPayload(BaseModel):
    phone: str
    otp: str
    email: Optional[str] = None

class VerifyOtpLoginPayload(BaseModel):
    phone: str
    otp: str

class VerifyResetPayload(BaseModel):
    phone: str
    otp: str
    newPassword: str

class EmailResetPayload(BaseModel):
    email: str
    newPassword: str

class SimulateEmailPayload(BaseModel):
    email: str

class RegisterPayload(BaseModel):
    email: str
    username: str
    password: str
    phone: Optional[str] = ""

class LoginPayload(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class Admin2faPayload(BaseModel):
    email: str
    code: str

class AdminPasswordPayload(BaseModel):
    email: str
    newPassword: str
    token: str

class UpdateProfilePayload(BaseModel):
    username: Optional[str] = None
    avatarUrl: Optional[str] = None
    displayName: Optional[str] = None
    password: Optional[str] = None
    emailVerified: Optional[bool] = None
    phoneVerified: Optional[bool] = None

class CreateChatPayload(BaseModel):
    mode: str = "general"

class UpdateChatPayload(BaseModel):
    title: str

class UpdateSettingsPayload(BaseModel):
    defaultModel: str
    systemPrompt: str
    aboutMe: str
    respondWay: str
    voiceEnabled: bool
    voiceName: str
    isDarkMode: bool


# --- NEW BACKEND REQUIRED ENDPOINTS ---

@app.get("/health")
def health_check():
    """
    GET /health: Active status probe
    """
    return {
        "status": "healthy",
        "engine": "FastAPI Python Backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.post("/search")
def run_search_endpoint(payload: SearchRequest):
    """
    POST /search: Run internet search query and return snippets
    """
    results = perform_web_search(payload.query, payload.limit)
    return {"results": results}


@app.post("/upload")
def upload_file_endpoint(payload: UploadRequest, user: Dict[str, Any] = Depends(verify_token)):
    """
    POST /upload: Accept base64 string or file documents for prompt analysis pipeline
    """
    try:
        # Pre-validate file representation
        b64_content = payload.base64
        if "," in b64_content:
            b64_content = b64_content.split(",")[1]
            
        decoded_bytes = base64.b64decode(b64_content)
        file_size_kb = len(decoded_bytes) / 1024
        
        return {
            "success": True,
            "filename": payload.filename,
            "type": payload.type,
            "size_kb": round(file_size_kb, 2),
            "token": "uploaded_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded file: {str(e)}")


@app.get("/history")
def get_user_history(user: Dict[str, Any] = Depends(verify_token)):
    """
    GET /history: Retrieve user previous conversations
    """
    chats = load_all_chats(user["id"])
    return {"chats": chats}


@app.post("/chat")
def handle_chat_endpoint(payload: ChatRequest, user: Dict[str, Any] = Depends(verify_token)):
    """
    POST /chat: Standard unified chat handling endpoint
    """
    db = read_db()
    current_chat = None
    
    # Check or generate chat conversation session
    if payload.chat_id:
        current_chat = load_chat_by_id(payload.chat_id, user["id"])
        
    if not current_chat:
        current_chat = create_new_chat(user["id"], payload.mode or "general")
        
    chat_id = current_chat["id"]
    
    # Clean message text
    prompt = payload.message
    attached_files = payload.files or []
    
    # Web search supplement support
    search_context = ""
    if payload.web_search:
        search_query = prompt[:100]
        search_results = perform_web_search(search_query, limit=3)
        if search_results:
            search_context = "\n\n[Supplementary Real-Time Web Knowledge context]:\n"
            for r in search_results:
                search_context += f"- Title: {r['title']}\n  Snippet: {r['snippet']}\n  URL: {r['url']}\n"
                
    # Model settings context
    user_settings = db.get("settings", {}).get(user["id"], {})
    system_instruction = user_settings.get("systemPrompt", "You are A-NOVA, a friendly, highly intelligent, and conversational AI assistant similar to ChatGPT. You have a warm, supportive, and engaging personality, using emojis naturally where appropriate (😊, 🚀, 💡, 🎯) to keep the chat lively. You format responses beautifully with clear structure, bullet points, and clean lists. For technical questions or requests, provide neat and complete code blocks or step-by-step tutorial-style explanations. When users ask for simple definitions, explain them in friendly, accessible language.")
    
    system_instruction += "\n\n[CRITICAL DIRECTIVE ON STYLE/TONE - DO NOT VIOLATE]:\n" + \
      "1. You MUST operate as a warm, friendly, intelligent, and natural human-like companion.\n" + \
      "2. NEVER output diagnostic headers, SYSTEM PING warnings, connection logs, STATUS reports, console blocks, or ASCII arts with terminal boxes.\n" + \
      "3. Keep answers concise, natural, and directly targeted to the user's question. Match style, vocabulary, and length of the user's query. Use emojis naturally and sparingly (only when appropriate).\n" + \
      "4. Do not output metadata or label your responses. Just talk to the user naturally! Avoid unnecessary introductory filler or greetings in the middle of a continuous conversation.\n" + \
      "5. NEVER mention memory limitations, say 'My memory is fresh', 'I cannot remember previous conversations', or explain that you do not have access to earlier chats unless asked.\n" + \
      "6. RESPONSE LENGTH RULES:\n" + \
      "   - Short/Simple Question -> Short/Simple Answer. (e.g. User says 'Hi' -> Answer with '👋 Hey! How can I help?', User says '2+2' -> Answer with '4 ✅', User says 'What is Python?' -> Answer with 'Python is an easy-to-learn, powerful programming language used for web dev, AI, and automation.').\n" + \
      "   - Complex/Thorough Question -> Give a detailed answer with bullet points or well-structured clean lists, including code or step-by-step math breakdowns where appropriate.\n" + \
      "   - Avoid repeating information or writing long paragraphs where a short, direct answer is enough."
    
    # Custom Mode prompt specializations
    m = payload.mode or current_chat.get("mode", "general")
    if m == "math":
        system_instruction += "\n\n[Mathematics Mode]: Frame mathematically rigorous explanations with structured formulation blocks."
    elif m == "coding":
        system_instruction += "\n\n[Coding Mode]: Return absolute pristine software solutions using clear descriptive commenting."
    elif m == "project":
        system_instruction += "\n\n[Project Board Mode]: Formulate standard WBS (Work Breakdown Structure) action plans."
        
    if search_context:
        system_instruction += f"\n\n{search_context}\nGround your statements based on the provided search context."
        
    # Standard message histories construction for conversational memory
    history_context = ""
    recent_msgs = current_chat.get("messages", [])[-6:] # Gather last 6 entries
    for m_entry in recent_msgs:
        history_context += f"\n{m_entry['role'].capitalize()}: {m_entry['content']}"
        
    full_prompt = f"{history_context}\nUser: {prompt}\nAssistant:" if history_context else prompt
    
    # Save user message to database
    save_chat_message(chat_id, user["id"], "user", prompt, attached_files)
    
    # Generate response
    ai_text = generate_ai_response(
        prompt=full_prompt,
        system_instruction=system_instruction,
        attached_files=attached_files,
        model_name=current_chat.get("selectedModel", "gemini-3.5-flash")
    )
    
    # Save assistant response to database
    saved_assistant_msg = save_chat_message(chat_id, user["id"], "assistant", ai_text)
    
    # Fetch final updated chat state
    updated_chat = load_chat_by_id(chat_id, user["id"])
    
    return {
        "chat_id": chat_id,
        "activeMessage": saved_assistant_msg,
        "chat": updated_chat
    }


# --- PYTHON API PORT ENDPOINTS MATCHING EXISTING NODE ROUTING OVERLAYS ---

@app.post("/api/auth/resolve-phone")
def resolve_phone(payload: ResolvePhonePayload):
    db = read_db()
    clean_phone = "".join(filter(str.isalnum, payload.phone))
    matched_user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone), None)
    if not matched_user:
        raise HTTPException(status_code=444, detail="No profile found matching this phone number.")
    return {"email": matched_user.get("email")}


@app.post("/api/auth/send-sms-otp")
def send_sms_otp(payload: SmsOtpPayload):
    db = read_db()
    clean_phone = "".join(filter(str.isalnum, payload.phone))
    matched_user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone), None)
    
    otp_code = str(random.randint(100000, 999999))
    otp_expires = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
    
    if matched_user:
        matched_user["otpCode"] = otp_code
        matched_user["otpExpires"] = otp_expires
    else:
        if "pendingOtps" not in db:
            db["pendingOtps"] = {}
        db["pendingOtps"][clean_phone] = {"otpCode": otp_code, "otpExpires": otp_expires}
        
    write_db(db)
    print(f"\n======================================================\n[PYTHON SMS] TO: {payload.phone}\nOTP VERIFICATION CODE: {otp_code}\n======================================================\n")
    return {"success": True, "otp": otp_code, "message": "Dispatched."}


@app.post("/api/auth/verify-sms-otp")
def verify_sms_otp(payload: VerifySmsPayload):
    db = read_db()
    clean_phone = "".join(filter(str.isalnum, payload.phone))
    matched_user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone or (payload.email and u.get("email", "").lower() == payload.email.lower())), None)
    
    registry_otp = db.get("pendingOtps", {}).get(clean_phone, {})
    target_code = matched_user.get("otpCode") if matched_user else registry_otp.get("otpCode")
    target_expires = matched_user.get("otpExpires") if matched_user else registry_otp.get("otpExpires")
    
    if payload.otp != "SIMULATED_BYPASS_MOBILE":
        if not target_code or target_code != payload.otp:
            raise HTTPException(status_code=400, detail="Incorrect OTP verification code.")
        if target_expires and datetime.fromisoformat(target_expires) < datetime.utcnow():
            raise HTTPException(status_code=400, detail="This OTP code has expired.")
            
    if matched_user:
        matched_user["phoneVerified"] = True
        matched_user["otpCode"] = None
        matched_user["otpExpires"] = None
    else:
        if "pendingVerifications" not in db:
            db["pendingVerifications"] = {}
        db["pendingVerifications"][clean_phone] = True
        
    write_db(db)
    return {"success": True}


@app.post("/api/auth/verify-sms-otp-login")
def verify_sms_otp_login(payload: VerifyOtpLoginPayload):
    db = read_db()
    clean_phone = "".join(filter(str.isalnum, payload.phone))
    matched_user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone), None)
    if not matched_user:
        raise HTTPException(status_code=400, detail="User not found.")
    if matched_user.get("otpCode") != payload.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP.")
        
    matched_user["phoneVerified"] = True
    matched_user["otpCode"] = None
    matched_user["token"] = "myai_token_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    write_db(db)
    return {
        "token": matched_user["token"],
        "user": {
            "id": matched_user["id"],
            "email": matched_user["email"],
            "username": matched_user["username"],
            "displayName": matched_user.get("displayName", matched_user["username"]),
            "createdAt": matched_user["createdAt"],
            "phone": matched_user.get("phone"),
            "emailVerified": True,
            "phoneVerified": True,
            "role": matched_user.get("role", "user"),
            "planStatus": "Plus"
        }
    }


@app.post("/api/auth/verify-sms-otp-reset")
def verify_sms_otp_reset(payload: VerifyResetPayload):
    db = read_db()
    clean_phone = "".join(filter(str.isalnum, payload.phone))
    matched_user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone), None)
    if not matched_user or matched_user.get("otpCode") != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid process parameters.")
        
    matched_user["password"] = hash_password(payload.newPassword)
    matched_user["otpCode"] = None
    matched_user["phoneVerified"] = True
    write_db(db)
    return {"success": True, "message": "Updated password successfully."}


@app.post("/api/auth/verify-email-reset")
def verify_email_reset(payload: EmailResetPayload):
    db = read_db()
    matched_user = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower()), None)
    if not matched_user:
        raise HTTPException(status_code=404, detail="Email not registered.")
    matched_user["password"] = hash_password(payload.newPassword)
    matched_user["emailVerified"] = True
    write_db(db)
    return {"success": True}


@app.post("/api/auth/simulate-email-confirm")
def simulate_email_confirm(payload: SimulateEmailPayload):
    db = read_db()
    matched_user = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower()), None)
    if matched_user:
        matched_user["emailVerified"] = True
        write_db(db)
        return {"success": True}
    raise HTTPException(status_code=404, detail="No profile found.")


@app.post("/api/auth/instant-activate")
def instant_activate(payload: SimulateEmailPayload):
    db = read_db()
    matched_user = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower()), None)
    if not matched_user:
        raise HTTPException(status_code=444, detail="User not found.")
        
    matched_user["emailVerified"] = True
    matched_user["phoneVerified"] = True
    matched_user["token"] = "myai_token_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    
    db.setdefault("loginLogs", []).append({
        "id": "log_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=9)),
        "userId": matched_user["id"],
        "email": matched_user["email"],
        "username": matched_user["username"],
        "role": matched_user.get("role", "user"),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    write_db(db)
    
    return {
        "token": matched_user["token"],
        "user": {
            "id": matched_user["id"],
            "email": matched_user["email"],
            "phone": matched_user.get("phone"),
            "username": matched_user["username"],
            "avatarUrl": matched_user.get("avatarUrl"),
            "emailVerified": True,
            "phoneVerified": True,
            "createdAt": matched_user["createdAt"],
            "role": matched_user.get("role", "user"),
            "planStatus": "Plus"
        }
    }


@app.post("/api/auth/register")
def register_user(payload: RegisterPayload):
    db = read_db()
    existing_user = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower()), None)
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered.")
        
    user_id = "user_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    token = "myai_token_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    
    new_user = {
        "id": user_id,
        "email": payload.email.lower(),
        "username": payload.username,
        "password": hash_password(payload.password),
        "phone": payload.phone,
        "emailVerified": False,
        "phoneVerified": False,
        "avatarUrl": f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.username}",
        "token": token,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "suspended": False,
        "role": "user"
    }
    
    db["users"].append(new_user)
    db.setdefault("settings", {})[user_id] = {
        "defaultModel": "gemini-3.5-flash",
        "systemPrompt": "You are A-NOVA, a friendly, highly intelligent, and conversational AI assistant similar to ChatGPT. You have a warm, supportive, and engaging personality, using emojis naturally where appropriate (😊, 🚀, 💡, 🎯) to keep the chat lively. You format responses beautifully with clear structure, bullet points, and clean lists. For technical questions or requests, provide neat and complete code blocks or step-by-step tutorial-style explanations. When users ask for simple definitions, explain them in friendly, accessible language.",
        "aboutMe": "",
        "respondWay": "",
        "voiceEnabled": False,
        "voiceName": "Zephyr",
        "isDarkMode": True
    }
    write_db(db)
    return {
        "token": token,
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "phone": new_user["phone"],
            "username": new_user["username"],
            "avatarUrl": new_user["avatarUrl"],
            "emailVerified": False,
            "phoneVerified": False,
            "createdAt": new_user["createdAt"],
            "role": "user"
        }
    }


@app.post("/api/auth/login")
def login_user(payload: LoginPayload, request: Request):
    db = read_db()
    user = None
    if payload.email:
        user = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower()), None)
    elif payload.phone:
        clean_phone = "".join(filter(str.isalnum, payload.phone))
        user = next((u for u in db.get("users", []) if "".join(filter(str.isalnum, u.get("phone", ""))) == clean_phone), None)
        
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials combination.")
        
    hashed_input = hash_password(payload.password)
    if user.get("password") != payload.password and user.get("password") != hashed_input:
        raise HTTPException(status_code=400, detail="Invalid credentials combination.")
        
    if user.get("suspended") is True:
        raise HTTPException(status_code=403, detail="Profile suspended.")
        
    # Standard Admin 2FA triggers
    if user.get("role") == "admin":
        two_factor = str(random.randint(100000, 999999))
        user["admin2faCode"] = two_factor
        user["admin2faExpires"] = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        write_db(db)
        print(f"\n======================================================\n[PYTHON ADMIN] 2FA SECURITY CHECK\nSECURITY PASSCODE SENT TO mainc983@gmail.com IS: {two_factor}\n======================================================\n")
        return {
            "require2fa": True,
            "email": user["email"],
            "phone": user.get("phone", "+1 (555) 720-3301"),
            "otp": two_factor,
            "message": "Secondary authentication challenged."
        }
        
    if not user.get("emailVerified") or not user.get("phoneVerified"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Unverified Account Assets",
                "unverified": True,
                "userId": user["id"],
                "email": user["email"],
                "phone": user.get("phone"),
                "emailVerified": user.get("emailVerified", False),
                "phoneVerified": user.get("phoneVerified", False)
            }
        )
        
    token = "myai_token_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    user["token"] = token
    
    db.setdefault("loginLogs", []).append({
        "id": "log_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=9)),
        "userId": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user.get("role", "user"),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    write_db(db)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "displayName": user.get("displayName", user["username"]),
            "avatarUrl": user.get("avatarUrl"),
            "createdAt": user["createdAt"],
            "phone": user.get("phone"),
            "emailVerified": True,
            "phoneVerified": True,
            "role": user.get("role", "user"),
            "planStatus": "Plus"
        }
    }


@app.post("/api/auth/verify-admin-2fa")
def verify_admin_2fa(payload: Admin2faPayload):
    db = read_db()
    admin = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower() and u.get("role") == "admin"), None)
    if not admin or admin.get("admin2faCode") != payload.code:
        raise HTTPException(status_code=400, detail="Verification code rejected.")
        
    token = "my_admin_token_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    admin["token"] = token
    admin["admin2faCode"] = None
    write_db(db)
    return {
        "token": token,
        "user": {
            "id": admin["id"],
            "email": admin["email"],
            "username": admin["username"],
            "displayName": "Platform Director",
            "avatarUrl": admin.get("avatarUrl"),
            "createdAt": admin["createdAt"],
            "role": "admin",
            "planStatus": "Plus",
            "mustChangePassword": False
        }
    }


@app.post("/api/auth/change-admin-password")
def change_admin_password(payload: AdminPasswordPayload):
    db = read_db()
    admin = next((u for u in db.get("users", []) if u.get("email", "").lower() == payload.email.lower() and u.get("role") == "admin"), None)
    if not admin or admin.get("token") != payload.token:
        raise HTTPException(status_code=400, detail="Action prohibited.")
        
    admin["password"] = hash_password(payload.newPassword)
    write_db(db)
    return {"success": True}


@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(verify_token)):
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "displayName": user.get("displayName", user["username"]),
        "avatarUrl": user.get("avatarUrl"),
        "phone": user.get("phone"),
        "emailVerified": user.get("emailVerified") is not False,
        "phoneVerified": user.get("phoneVerified") is not False,
        "createdAt": user["createdAt"],
        "role": user.get("role", "user"),
        "planStatus": user.get("planStatus", "Plus")
    }


@app.put("/api/auth/profile")
def update_profile(payload: UpdateProfilePayload, user: Dict[str, Any] = Depends(verify_token)):
    db = read_db()
    idx = next((i for i, u in enumerate(db["users"]) if u["id"] == user["id"]), None)
    if idx is None:
        raise HTTPException(status_code=444, detail="Not found.")
        
    user_ref = db["users"][idx]
    if payload.username:
        user_ref["username"] = payload.username
    if payload.avatarUrl:
        user_ref["avatarUrl"] = payload.avatarUrl
    if payload.displayName:
        user_ref["displayName"] = payload.displayName
    if payload.password:
        user_ref["password"] = hash_password(payload.password)
    if payload.emailVerified is not None:
        user_ref["emailVerified"] = payload.emailVerified
    if payload.phoneVerified is not None:
        user_ref["phoneVerified"] = payload.phoneVerified
        
    write_db(db)
    return {
        "id": user_ref["id"],
        "email": user_ref["email"],
        "username": user_ref["username"],
        "displayName": user_ref.get("displayName", user_ref["username"]),
        "avatarUrl": user_ref.get("avatarUrl"),
        "phone": user_ref.get("phone"),
        "emailVerified": user_ref.get("emailVerified") is not False,
        "phoneVerified": user_ref.get("phoneVerified") is not False,
        "createdAt": user_ref["createdAt"],
        "role": user_ref.get("role", "user"),
        "planStatus": "Plus"
    }


@app.get("/api/chats")
def get_chats_endpoint(user: Dict[str, Any] = Depends(verify_token)):
    chats = load_all_chats(user["id"])
    return [
        {
            "id": c["id"],
            "title": c["title"],
            "mode": c.get("mode", "general"),
            "selectedModel": c.get("selectedModel", "gemini-3.5-flash"),
            "createdAt": c["createdAt"],
            "updatedAt": c.get("updatedAt", c["createdAt"])
        }
        for c in chats
    ]


@app.post("/api/chats")
def create_chat_endpoint(payload: CreateChatPayload, user: Dict[str, Any] = Depends(verify_token)):
    return create_new_chat(user["id"], payload.mode)


@app.get("/api/chats/{chat_id}")
def get_chat_id_details(chat_id: str, user: Dict[str, Any] = Depends(verify_token)):
    chat = load_chat_by_id(chat_id, user["id"])
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return chat


@app.put("/api/chats/{chat_id}")
def update_chat_id_title(chat_id: str, payload: UpdateChatPayload, user: Dict[str, Any] = Depends(verify_token)):
    db = read_db()
    chat = next((c for c in db.get("chats", []) if c["id"] == chat_id and c["userId"] == user["id"]), None)
    if not chat:
        raise HTTPException(status_code=444, detail="Not found.")
    chat["title"] = payload.title
    chat["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    write_db(db)
    return chat


@app.delete("/api/chats/{chat_id}")
def delete_chat_id(chat_id: str, user: Dict[str, Any] = Depends(verify_token)):
    db = read_db()
    db["chats"] = [c for c in db.get("chats", []) if not (c["id"] == chat_id and c["userId"] == user["id"])]
    write_db(db)
    return {"success": True}


@app.get("/api/settings")
def get_user_settings(user: Dict[str, Any] = Depends(verify_token)):
    db = read_db()
    settings = db.get("settings", {}).get(user["id"])
    if not settings:
        settings = {
            "defaultModel": "gemini-3.5-flash",
            "systemPrompt": "You are A-NOVA, a friendly, highly intelligent, and conversational AI assistant similar to ChatGPT. You have a warm, supportive, and engaging personality, using emojis naturally where appropriate (😊, 🚀, 💡, 🎯) to keep the chat lively. You format responses beautifully with clear structure, bullet points, and clean lists. For technical questions or requests, provide neat and complete code blocks or step-by-step tutorial-style explanations. When users ask for simple definitions, explain them in friendly, accessible language.",
            "aboutMe": "",
            "respondWay": "",
            "voiceEnabled": False,
            "voiceName": "Zephyr",
            "isDarkMode": True
        }
        db.setdefault("settings", {})[user["id"]] = settings
        write_db(db)
    return settings


@app.put("/api/settings")
def save_user_settings(payload: UpdateSettingsPayload, user: Dict[str, Any] = Depends(verify_token)):
    db = read_db()
    db.setdefault("settings", {})[user["id"]] = payload.dict()
    write_db(db)
    return payload


class SendMessagePayload(BaseModel):
    content: Optional[str] = ""
    attachedFiles: Optional[List[Dict[str, Any]]] = []


@app.post("/api/chats/{chat_id}/message")
def send_message_endpoint(chat_id: str, payload: SendMessagePayload, user: Dict[str, Any] = Depends(verify_token)):
    """
    Overlays standard conversational chat sequence with message database.
    """
    db = read_db()
    chat = next((c for c in db.get("chats", []) if c["id"] == chat_id and c["userId"] == user["id"]), None)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat conversation not found.")
        
    prompt = payload.content or ""
    attached_files = payload.attachedFiles or []
    
    # Save user message
    user_msg = save_chat_message(chat_id, user["id"], "user", prompt, attached_files)
    
    # Retrieve user configurations
    user_settings = db.get("settings", {}).get(user["id"], {})
    system_instruction = user_settings.get("systemPrompt", "You are A-NOVA, a friendly, highly intelligent, and conversational AI assistant similar to ChatGPT. You have a warm, supportive, and engaging personality, using emojis naturally where appropriate (😊, 🚀, 💡, 🎯) to keep the chat lively. You format responses beautifully with clear structure, bullet points, and clean lists. For technical questions or requests, provide neat and complete code blocks or step-by-step tutorial-style explanations. When users ask for simple definitions, explain them in friendly, accessible language.")
    
    system_instruction += "\n\n[CRITICAL DIRECTIVE ON STYLE/TONE - DO NOT VIOLATE]:\n" + \
      "1. You MUST operate as a warm, friendly, intelligent, and natural human-like companion.\n" + \
      "2. NEVER output diagnostic headers, SYSTEM PING warnings, connection logs, STATUS reports, console blocks, or ASCII arts with terminal boxes.\n" + \
      "3. Keep answers concise, natural, and directly targeted to the user's question. Match style, vocabulary, and length of the user's query. Use emojis naturally and sparingly (only when appropriate).\n" + \
      "4. Do not output metadata or label your responses. Just talk to the user naturally! Avoid unnecessary introductory filler or greetings in the middle of a continuous conversation.\n" + \
      "5. NEVER mention memory limitations, say 'My memory is fresh', 'I cannot remember previous conversations', or explain that you do not have access to earlier chats unless asked.\n" + \
      "6. RESPONSE LENGTH RULES:\n" + \
      "   - Short/Simple Question -> Short/Simple Answer. (e.g. User says 'Hi' -> Answer with '👋 Hey! How can I help?', User says '2+2' -> Answer with '4 ✅', User says 'What is Python?' -> Answer with 'Python is an easy-to-learn, powerful programming language used for web dev, AI, and automation.').\n" + \
      "   - Complex/Thorough Question -> Give a detailed answer with bullet points or well-structured clean lists, including code or step-by-step math breakdowns where appropriate.\n" + \
      "   - Avoid repeating information or writing long paragraphs where a short, direct answer is enough."
    
    # Specializations presets
    m = chat.get("mode", "general")
    if m == "math":
        system_instruction += "\n\n[Math Specialization Preset]: Detail breakdowns sequentially."
    elif m == "coding":
        system_instruction += "\n\n[Coding Specialization Preset]: Keep response codes pristine with descriptions."
    elif m == "project":
        system_instruction += "\n\n[Project Specialization Preset]: Keep timelines organized."
        
    ai_text = generate_ai_response(
        prompt=prompt,
        system_instruction=system_instruction,
        attached_files=attached_files,
        model_name=chat.get("selectedModel", "gemini-3.5-flash")
    )
    
    # Save Assistant response
    assistant_msg = save_chat_message(chat_id, user["id"], "assistant", ai_text)
    
    return {
        "activeMessage": assistant_msg,
        "chat": load_chat_by_id(chat_id, user["id"])
    }


# Administrative overlays APIs
@app.get("/api/admin/users")
def get_admin_users(user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    return [
        {
            "id": u["id"],
            "email": u["email"],
            "username": u["username"],
            "phone": u.get("phone"),
            "role": u.get("role", "user"),
            "createdAt": u["createdAt"],
            "emailVerified": u.get("emailVerified") is not False,
            "phoneVerified": u.get("phoneVerified") is not False,
            "suspended": u.get("suspended", False)
        }
        for u in db.get("users", [])
    ]


@app.put("/api/admin/users/{target_id}")
def update_admin_user(target_id: str, payload: Dict[str, Any], user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    target = next((u for u in db["users"] if u["id"] == target_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if "suspended" in payload:
        target["suspended"] = payload["suspended"]
    if "role" in payload:
        target["role"] = payload["role"]
        
    write_db(db)
    return target


@app.delete("/api/admin/users/{target_id}")
def delete_admin_user(target_id: str, user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    db["users"] = [u for u in db["users"] if u["id"] != target_id]
    write_db(db)
    return {"success": True}


@app.get("/api/admin/stats")
def get_admin_stats(user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    users = db.get("users", [])
    chats = db.get("chats", [])
    logs = db.get("loginLogs", [])
    
    return {
        "usersCount": len(users),
        "chatsCount": len(chats),
        "logsCount": len(logs),
        "registrations": len(users),
        "messagesCount": sum(len(c.get("messages", [])) for c in chats)
    }


@app.get("/api/admin/logs")
def get_admin_logs(user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    logs = db.get("loginLogs", [])
    # Sort descending
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return logs


@app.get("/api/admin/settings")
def get_admin_settings(user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    return db.get("adminSettings", {"registrationsEnabled": True, "maintenanceMode": False, "systemNotification": ""})


@app.put("/api/admin/settings")
def save_admin_settings(payload: Dict[str, Any], user: Dict[str, Any] = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden.")
    db = read_db()
    db["adminSettings"] = payload
    write_db(db)
    return payload


if __name__ == "__main__":
    import uvicorn
    # Serves the FastAPI server on port 5000 internally
    uvicorn.run("backend.main:app", host="0.0.0.0", port=5000, reload=True)
