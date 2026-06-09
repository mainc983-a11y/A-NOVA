import os
import base64
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

def get_gemini_client() -> Optional[genai.Client]:
    """
    Instantiate and return the modern Google GenAI Client safely using environment secrets.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return None
    try:
        # Initialise Google GenAI client
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Failed to load Google GenAI instance: {e}")
        return None

def select_model(stored_model_name: Optional[str]) -> str:
    """
    Resolves the developer's requested model into a valid Gemini model tag.
    """
    if not stored_model_name:
        return "gemini-3.5-flash"
    
    name = stored_model_name.lower()
    if "flash" in name:
        if "lite" in name:
            return "gemini-3.1-flash-lite"
        return "gemini-3.5-flash"
    elif "pro" in name:
        return "gemini-3.1-pro-preview"
    return "gemini-3.5-flash"

def generate_ai_response(
    prompt: str,
    system_instruction: str,
    attached_files: List[Dict[str, Any]] = None,
    temperature: float = 0.7,
    model_name: str = "gemini-3.5-flash"
) -> str:
    """
    Transmits user prompt, file multi-modal elements, and structured system guidelines to the API.
    """
    client = get_gemini_client()
    if not client:
        return (
            "⚠️ **A-NOVA Python AI Broker Notification**\n\n"
            "The backend has not been supplied with a valid `GEMINI_API_KEY`.\n\n"
            "Please assign a valid key inside the standard variable definitions or the workspace secrets panel."
        )
        
    resolved_model = select_model(model_name)
    contents = []
    
    # Process multi-modal PDF, image, and document uploads
    if attached_files:
        for f in attached_files:
            b64_data = f.get("base64") or f.get("data")
            if b64_data:
                try:
                    if "," in b64_data:
                        b64_data = b64_data.split(",")[1]
                    file_bytes = base64.b64decode(b64_data)
                    mime = f.get("type") or f.get("mimeType") or "image/png"
                    
                    part = types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=mime
                    )
                    contents.append(part)
                except Exception as e:
                    print(f"Skipping failed file attachment decode: {e}")
                    
    # Append raw text prompt
    contents.append(prompt)
    
    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature
        )
        
        response = client.models.generate_content(
            model=resolved_model,
            contents=contents,
            config=config
        )
        return response.text or "Unable to formulate a response sequence."
    except Exception as e:
        return f"⚠️ **Gemini Model Broker Error:** {str(e)}"
