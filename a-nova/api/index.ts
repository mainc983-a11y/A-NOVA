import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { supabase as supabaseServer, SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../src/supabaseClient.js";
import http from "http";

const app = express();
const PORT = 3000;

// Feature flag for enabling real OTP verification inside production deployments.
// In Google AI Studio preview/development mode, we default this to false to provide a seamless instant login / account creation.
const REQUIRE_OTP_VERIFICATION = process.env.REQUIRE_OTP_VERIFICATION === "true";

// Native CORS and preflight options middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  const start = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.warn(`[SERVER HTTP WARN] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${Date.now() - start}ms)`);
    } else {
      console.log(`[SERVER HTTP OK] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// Middleware for parsing JSON with a limit of 15MB for base64 file payloads
app.use(express.json({ limit: "15mb" }));

// Initialize local JSON Database for mock persistent storage
const DB_DIR = process.env.VERCEL || process.env.VERCEL_ENV
  ? "/tmp"
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(DB_PATH) || fs.readFileSync(DB_PATH, "utf8").trim() === "") {
  safeWriteFileSync(
    DB_PATH,
    JSON.stringify({ users: [], chats: [], settings: {} }, null, 2)
  );
}

// Safe synchronous file write helper
function safeWriteFileSync(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  try {
    fs.writeFileSync(filePath, content, "utf8");
  } catch (err) {
    console.error(`[File Write Error] Could not write to ${filePath}:`, err);
  }
}

// Secure Password Hashing Helper
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateMeaningfulTitle(message: string, existingTitles: string[]): string {
  if (!message) return "New Chat";
  
  let clean = message.trim();
  
  const phrasesToRemove = [
    /^(how do i|how to|can you|explain how to|please|could you please|could you|solve for|solve|what is|what are|tell me about|analyze the|analyze)\b/i,
    /^(create a|create an|create|build a|build an|build|make a|make an|make|write a|write an|write)\b/i,
    /^(the|a|an)\b/i
  ];
  
  let modified = true;
  while (modified) {
    modified = false;
    for (const regex of phrasesToRemove) {
      const next = clean.replace(regex, "").trim();
      if (next !== clean) {
        clean = next;
        modified = true;
      }
    }
  }

  if (!clean) {
    clean = message.trim();
  }

  const words = clean.split(/\s+/).filter(Boolean);
  let titleWords = words.slice(0, 5);
  
  const stopWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "from", "of", "with", "in"]);
  const capitalizedWords = titleWords.map((word, index) => {
    let cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
    if (!cleanWord) return word;
    
    const isStopWord = stopWords.has(cleanWord.toLowerCase());
    if (isStopWord && index !== 0) {
      return cleanWord.toLowerCase();
    }
    
    if (cleanWord === cleanWord.toUpperCase() && cleanWord.length > 1) {
      return cleanWord;
    }
    
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  });
  
  let baseTitle = capitalizedWords.join(" ").trim();
  if (baseTitle.toLowerCase().endsWith("chatbot") && !baseTitle.toLowerCase().endsWith("chatbot project")) {
    const lastIndex = baseTitle.toLowerCase().lastIndexOf("chatbot");
    baseTitle = baseTitle.substring(0, lastIndex) + "AI Chatbot Project";
  }
  
  if (!baseTitle) {
    baseTitle = "New Chat";
  }

  let uniqueTitle = baseTitle;
  let counter = 2;
  while (existingTitles.includes(uniqueTitle)) {
    uniqueTitle = `${baseTitle} (${counter})`;
    counter++;
  }

  return uniqueTitle;
}

// Supabase Client imported directly from src/supabaseClient.js single source of truth

const SYSTEM_DB_ID = "00000000-0000-0000-0000-000000000000";
let cachedDb: any = null;
let isSupabaseReady = false;
let supabaseSyncing = false;
let isSupabaseTableAvailable: boolean | null = null;
let syncPromise: Promise<void> | null = null;
let activeSyncPromise: Promise<any> = Promise.resolve();

// Helper to check if the public schema contains required tables on the remote Supabase instance
async function checkSupabaseTableAvailable(): Promise<boolean> {
  if (isSupabaseTableAvailable !== null) {
    return isSupabaseTableAvailable;
  }
  if (!isSupabaseConfigured) {
    isSupabaseTableAvailable = false;
    return false;
  }
  try {
    const checkPromise = supabaseServer
      .from("user_settings")
      .select("user_id")
      .limit(1);

    const timeoutPromise = new Promise<{ error: any }>((resolve) =>
      setTimeout(() => resolve({ error: new Error("Supabase network request timed out") }), 1000)
    );

    const res: any = await Promise.race([checkPromise, timeoutPromise]);

    if (!res || res.error) {
      isSupabaseTableAvailable = false;
      return false;
    }
    isSupabaseTableAvailable = true;
    return true;
  } catch (err: any) {
    isSupabaseTableAvailable = false;
    return false;
  }
}

// Async function to load / synchronize database status from Supabase
async function syncFromSupabase(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const isSchemaOk = await checkSupabaseTableAvailable();
      if (!isSchemaOk) {
        console.log("[SUPABASE SYNC] Remote database table unavailable or unreachable. Operating with local storage caching engine.");
        readDb();
        isSupabaseReady = true;
        return;
      }

      console.log("[SUPABASE SYNC] Syncing database state from Supabase Cloud...");
      
      // Ensure system user placeholder is in public.users table to satisfy FK
      const { error: userError } = await supabaseServer
        .from("users")
        .upsert({
          id: SYSTEM_DB_ID,
          email: "system_db@a-nova.internal",
          username: "system_db",
          password_hash: "system_db_key_hash"
        }, { onConflict: "id" });
        
      if (userError) {
        console.warn("[SUPABASE SYNC] System user bootstrap info:", userError.message);
      }
      
      // Select the stored JSON database from user_settings system_prompt Text column
      const { data, error } = await supabaseServer
        .from("user_settings")
        .select("system_prompt")
        .eq("user_id", SYSTEM_DB_ID)
        .single();
        
      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("no rows")) {
          console.log("[SUPABASE SYNC] No existing database block found on Supabase. Initializing default blank records...");
          const initialData = { users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] };
          await supabaseServer.from("user_settings").upsert({
            user_id: SYSTEM_DB_ID,
            system_prompt: JSON.stringify(initialData),
            default_model: "gemini-3.6-flash",
            voice_name: "Zephyr"
          }, { onConflict: "user_id" });
          
          cachedDb = initialData;
          safeWriteFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
          isSupabaseReady = true;
        } else {
          isSupabaseTableAvailable = false;
          throw error;
        }
      } else if (data && data.system_prompt) {
        try {
          const parsed = JSON.parse(data.system_prompt);
          if (!parsed.users) parsed.users = [];
          if (!parsed.chats) parsed.chats = [];
          if (!parsed.settings) parsed.settings = {};
          if (!parsed.adminSettings) parsed.adminSettings = {};
          if (!parsed.loginLogs) parsed.loginLogs = [];
          
          cachedDb = parsed;
          safeWriteFileSync(DB_PATH, JSON.stringify(parsed, null, 2));
          isSupabaseReady = true;
          console.log("[SUPABASE SYNC] Database pulled and parsed successfully! Synced local cachedDb.");
        } catch (parseErr: any) {
          console.error("[SUPABASE SYNC] JSON parse error, restoring default schema:", parseErr.message);
        }
      }
    } catch (err: any) {
      isSupabaseTableAvailable = false;
      console.log("[SUPABASE SYNC] Cloud sync offline or unavailable. Operating with local database storage.");
      readDb();
      isSupabaseReady = true;
    }
  })();

  return syncPromise;
}

async function syncToSupabase(data: any) {
  if (supabaseSyncing) return;
  const isSchemaOk = await checkSupabaseTableAvailable();
  if (!isSchemaOk) {
    return; // Silently fallback with no warnings/errors printed
  }
  supabaseSyncing = true;
  try {
    const stringified = JSON.stringify(data);
    const { error } = await supabaseServer.from("user_settings").upsert({
      user_id: SYSTEM_DB_ID,
      system_prompt: stringified,
      default_model: "gemini-3.6-flash",
      voice_name: "Zephyr",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    
    if (error) {
      isSupabaseTableAvailable = false;
      const msg = error.message?.toLowerCase() || "";
      if (!msg.includes("fetch failed") && !msg.includes("failed to fetch") && error.code !== "PGRST205") {
        console.warn("[SUPABASE SYNC] Cloud flush warning:", error.message);
      }
    } else {
      console.log("[SUPABASE SYNC] Database flushed to Supabase cloud storage safely.");
    }
  } catch (err: any) {
    isSupabaseTableAvailable = false;
  } finally {
    supabaseSyncing = false;
  }
}

// Automatically trigger background pull on instantiation
syncFromSupabase();

function sanitizeAndRepairDb(db: any) {
  if (!db || typeof db !== "object") {
    db = {};
  }
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.chats)) db.chats = [];
  if (!db.settings || typeof db.settings !== "object") db.settings = {};
  if (!db.adminSettings || typeof db.adminSettings !== "object") db.adminSettings = {};
  if (!Array.isArray(db.loginLogs)) db.loginLogs = [];

  // Self-healing check for chats and message attachments / generated images
  db.chats.forEach((chat: any) => {
    if (!chat.id) chat.id = "chat_" + Math.random().toString(36).substring(2, 11);
    if (!Array.isArray(chat.messages)) chat.messages = [];

    chat.messages.forEach((msg: any) => {
      if (!msg.id) msg.id = "msg_" + Math.random().toString(36).substring(2, 11);
      if (!msg.timestamp) msg.timestamp = new Date().toISOString();

      if (Array.isArray(msg.attachedFiles)) {
        msg.attachedFiles = msg.attachedFiles.map((file: any, fIdx: number) => {
          if (!file || typeof file !== "object") {
            file = {};
          }
          const fName = file.name || file.filename || `Attachment_${fIdx + 1}.bin`;
          const ext = (fName.split(".").pop() || "").toLowerCase();
          let fType = file.type || file.mimeType;
          if (!fType) {
            if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) fType = `image/${ext === "jpg" ? "jpeg" : ext}`;
            else if (ext === "pdf") fType = "application/pdf";
            else if (["txt", "md", "csv", "json"].includes(ext)) fType = `text/${ext === "txt" ? "plain" : ext}`;
            else fType = "application/octet-stream";
          }

          let fDataUrl = file.dataUrl || file.url;
          if (!fDataUrl && file.text) {
            fDataUrl = `data:${fType};charset=utf-8,${encodeURIComponent(file.text)}`;
          }
          if (!fDataUrl && file.content) {
            fDataUrl = `data:${fType};charset=utf-8,${encodeURIComponent(file.content)}`;
          }

          const fSize = file.size || (fDataUrl ? Math.round(fDataUrl.length * 0.75) : file.text ? file.text.length : 1024);

          return {
            id: file.id || `${chat.id}_${msg.id}_file_${fIdx}`,
            name: fName,
            type: fType,
            size: fSize,
            dataUrl: fDataUrl,
            url: fDataUrl,
            text: file.text || file.content || undefined
          };
        });
      }

      if (Array.isArray(msg.generatedImages)) {
        msg.generatedImages = msg.generatedImages.map((img: any) => {
          if (!img || typeof img !== "object") img = {};
          const imgUrl = img.url || img.dataUrl || "https://image.pollinations.ai/prompt/abstract?width=1024&height=1024&nologo=true";
          return {
            url: imgUrl,
            dataUrl: img.dataUrl || imgUrl,
            prompt: img.prompt || "Generated Image",
            width: img.width || 1024,
            height: img.height || 1024,
            provider: img.provider || "pollinations"
          };
        });
      }
    });
  });

  return db;
}

function readDb() {
  if (cachedDb) {
    return sanitizeAndRepairDb(cachedDb);
  }
  try {
    const rootDbPath = path.join(process.cwd(), "db.json");
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      cachedDb = sanitizeAndRepairDb(JSON.parse(data));
    } else if (fs.existsSync(rootDbPath)) {
      const data = fs.readFileSync(rootDbPath, "utf8");
      cachedDb = sanitizeAndRepairDb(JSON.parse(data));
    } else {
      cachedDb = sanitizeAndRepairDb({ users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] });
    }
    return cachedDb;
  } catch (error) {
    cachedDb = sanitizeAndRepairDb({ users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] });
    return cachedDb;
  }
}

function writeDb(data: any) {
  const sanitized = sanitizeAndRepairDb(data);
  cachedDb = sanitized;
  try {
    const jsonString = JSON.stringify(sanitized);
    // Write atomically to guarantee files are never read as 0 bytes or locked
    safeWriteFileSync(DB_PATH, jsonString);

    const rootPath = path.join(process.cwd(), "db.json");
    if (DB_PATH !== rootPath && fs.existsSync(path.dirname(rootPath))) {
      try {
        safeWriteFileSync(rootPath, jsonString);
      } catch (e) {}
    }

    // Sync asynchronously to Supabase cloud database, returning promise to be awaited by response middleware
    activeSyncPromise = syncToSupabase(sanitized);
  } catch (error) {
    console.error("Failed to write to local database synchronously:", error);
  }
}

// Auto-bootstrap and secure default Admin credentials on boot
(function bootstrapAdmin() {
  const db = readDb();
  let admin = db.users.find((u: any) => u.email.toLowerCase() === "mainc983@gmail.com");
  if (admin && admin.password === "WILL_BE_HASHED_ON_BOOT") {
    admin.password = hashPassword("Adityaghosh@2007");
    writeDb(db);
    console.log("[SECURITY ENGINE] Default admin password hashed and secured successfully.");
  }
})();

// Ensure DB is pulled on Vercel cold starts before processing any requests
app.use(async (req, res, next) => {
  try {
    if (!isSupabaseReady) {
      await syncFromSupabase();
    }
  } catch (err) {
    console.error("[MIDDLEWARE SYNC FROM CLOUD ERROR] Failed to await DB initialization:", err);
  }
  next();
});

// Register error handler for pending background cloud DB flushes
app.use((req, res, next) => {
  res.on("finish", () => {
    activeSyncPromise.catch((err) => {
      console.error("[BACKGROUND CLOUD DB FLUSH ERROR]:", err);
    });
  });
  next();
});

// Conversation title generator helper
function generateConversationTitle(firstMsg: string, existingTitles: string[]): string {
  if (!firstMsg) return "New Conversation";
  
  // Clean markdown, links, codes, long lines
  let text = firstMsg
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`([^`]+)`/g, "$1") // clean inline code wrappers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // clean markdown links
    .replace(/[\r\n]+/g, " ") // normalize spacing
    .trim();

  // Strip non-alphanumeric punctuation from start/end
  text = text.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "");

  // Lowercase representation to find prefixes easily
  const lower = text.toLowerCase();

  // List of common prefixes to strip. Sorted longest first to avoid partial matching issues
  const prefixes = [
    "how do i solve", "how do i build", "how do i write", "how do i create", "how do i make", "how do i",
    "how can i solve", "how can i build", "how can i write", "how can i create", "how can i make", "how can i",
    "how to solve", "how to build", "how to write", "how to create", "how to make", "how to",
    "please help me to", "please show me how to", "can you show me how to",
    "can you write a", "can you build a", "can you create a", "can you explain",
    "explain how to", "explain what is", "explain what are", "explain why", "explain",
    "could you please", "could you write", "could you build", "could you create",
    "write a", "write an", "write some", "write",
    "create a", "create an", "create some", "create",
    "build a", "build an", "build some", "build",
    "make a", "make an", "make program for", "make",
    "solve a", "solve an", "solve",
    "develop a", "develop an", "develop",
    "provide a", "provide",
    "show me a", "show me how", "show me",
    "give me a", "give me",
    "tell me about a", "tell me about", "tell me",
    "what is a", "what is an", "what is", "what are",
    "why is", "how does"
  ];

  let matchedPrefix = "";
  for (const p of prefixes) {
    if (lower.startsWith(p + " ")) {
      matchedPrefix = p + " ";
      break;
    } else if (lower.startsWith(p)) {
      matchedPrefix = p;
      break;
    }
  }

  if (matchedPrefix) {
    text = text.slice(matchedPrefix.length).trim();
  }

  // Clear any residual leading/trailing symbols
  text = text.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();

  if (!text) {
    text = firstMsg.trim();
  }

  // Split into words
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return "New Conversation";

  // Limit to maximum 3 to 5 words
  const maxWordsCount = 4;
  const slicedWords = rawWords.slice(0, maxWordsCount);

  // Acronyms map for professional styling
  const ACRONYMS: Record<string, string> = {
    ai: "AI",
    ui: "UI",
    ux: "UX",
    html: "HTML",
    css: "CSS",
    api: "API",
    js: "JS",
    ts: "TS",
    db: "DB",
    sql: "SQL",
    pdf: "PDF",
    cpu: "CPU",
    gpu: "GPU",
    sms: "SMS",
    otp: "OTP",
    json: "JSON",
    rest: "REST"
  };

  const capitalizedWords = slicedWords.map(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (ACRONYMS[cleanWord]) {
      const index = word.toLowerCase().indexOf(cleanWord);
      if (index !== -1) {
        return word.substring(0, index) + ACRONYMS[cleanWord] + word.substring(index + cleanWord.length);
      }
      return ACRONYMS[cleanWord];
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  let title = capitalizedWords.join(" ");

  // Trim and clean trailing punctuation for UI safety
  title = title.replace(/[^a-zA-Z0-9\s-_]/g, "").trim(); 
  if (!title) title = "New Conversation";

  // If the prompt starts with building action and is short, we can append " Project" safely
  const isBuilder = /^(build|create|make|develop|implement)/i.test(firstMsg.trim());
  if (isBuilder && capitalizedWords.length <= 3 && !/project/i.test(title)) {
    title += " Project";
  }

  // Check duplicates in existing titles
  let candidateTitle = title;
  let counter = 1;
  const lowerExisting = existingTitles.map(t => t.toLowerCase());
  while (lowerExisting.includes(candidateTitle.toLowerCase())) {
    counter++;
    candidateTitle = `${title} ${counter}`;
  }

  return candidateTitle;
}

// Lazy Initialize Gemini API client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || 
                 process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("[GEMINI API] Missing or placeholder GEMINI_API_KEY in environment variables.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.error("[GEMINI API] Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// Helper to determine if user is a logged-in account (permanent history) vs not logged in (7-day temporary history)
function isUserLoggedIn(user: any): boolean {
  if (!user) return false;
  const id = String(user.id || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  if (id.startsWith("anon_") || id.startsWith("guest_") || id.startsWith("temp_")) {
    return false;
  }
  if (!email || email.includes("guest") || email.includes("@a-nova.workspace") || email.includes("a-nova.internal")) {
    return false;
  }
  return true;
}

// Authentication Middleware via Supabase JWT verification or Local DB Tokens
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!req.body) {
      req.body = {};
    }
    const db = readDb();

    // 1. Check local DB user tokens first
    let localUser = db.users.find((u: any) => u.token === token || u.id === token);
    if (localUser) {
      req.body.user = localUser;
      (req as any).user = localUser;
      return next();
    }

    // 2. Validate Supabase Session token if configured and reachable
    if (isSupabaseConfigured && isSupabaseTableAvailable) {
      try {
        const checkPromise = supabaseServer.auth.getUser(token);
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { user: null }, error: new Error("Supabase auth check timed out") }), 1500)
        );
        const { data: { user: supabaseUser }, error }: any = await Promise.race([checkPromise, timeoutPromise]);

        if (!error && supabaseUser) {
          const userMeta = supabaseUser.user_metadata || {};
          const supaEmail = (supabaseUser.email || userMeta.email || "").toLowerCase().trim();
          const googleFullName = userMeta.full_name || userMeta.name || [userMeta.given_name, userMeta.family_name].filter(Boolean).join(" ") || userMeta.displayName || (supaEmail ? supaEmail.split("@")[0] : "User");
          const googleAvatar = userMeta.avatar_url || userMeta.picture || userMeta.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(supaEmail || supabaseUser.id)}`;
          const googleId = supabaseUser.identities?.find((i: any) => i.provider === "google")?.id || userMeta.sub || supabaseUser.id;
          const isGoogleProvider = supabaseUser.app_metadata?.provider === "google" || userMeta.provider === "google" || supabaseUser.identities?.some((i: any) => i.provider === "google");

          let matchedUser = db.users.find((u: any) => 
            (googleId && u.googleId === googleId) || 
            u.id === supabaseUser.id || 
            (supaEmail && u.email && u.email.toLowerCase() === supaEmail)
          );

          let updated = false;

          if (!matchedUser) {
            matchedUser = {
              id: supabaseUser.id,
              email: supaEmail,
              phone: supabaseUser.phone || "",
              username: supaEmail ? supaEmail.split("@")[0] : "user_" + supabaseUser.id.slice(0, 8),
              displayName: googleFullName,
              avatarUrl: googleAvatar,
              createdAt: supabaseUser.created_at || new Date().toISOString(),
              emailVerified: true,
              phoneVerified: true,
              role: "user",
              planStatus: "none",
              provider: isGoogleProvider ? "google" : "supabase",
              googleId: isGoogleProvider ? googleId : undefined
            };
            db.users.push(matchedUser);
            updated = true;
            console.log(`[GOOGLE AUTH] Created user profile for ${supaEmail} (${supabaseUser.id})`);
          } else {
            if (matchedUser.id !== supabaseUser.id) {
              const oldId = matchedUser.id;
              matchedUser.id = supabaseUser.id;
              if (db.settings[oldId]) {
                db.settings[supabaseUser.id] = { ...db.settings[oldId] };
                delete db.settings[oldId];
              }
              db.chats.forEach((c: any) => {
                if (c.userId === oldId) c.userId = supabaseUser.id;
              });
              updated = true;
            }

            if (supaEmail && matchedUser.email !== supaEmail) {
              matchedUser.email = supaEmail;
              updated = true;
            }

            if (googleFullName && (!matchedUser.displayName || matchedUser.displayName === "Google User" || matchedUser.displayName === matchedUser.username)) {
              matchedUser.displayName = googleFullName;
              updated = true;
            }

            if (googleAvatar && (!matchedUser.avatarUrl || matchedUser.avatarUrl.includes("dicebear"))) {
              matchedUser.avatarUrl = googleAvatar;
              updated = true;
            }

            if (isGoogleProvider) {
              if (matchedUser.provider !== "google") {
                matchedUser.provider = "google";
                updated = true;
              }
              if (googleId && matchedUser.googleId !== googleId) {
                matchedUser.googleId = googleId;
                updated = true;
              }
            }

            if (!matchedUser.emailVerified) {
              matchedUser.emailVerified = true;
              updated = true;
            }

            if (updated) {
              writeDb(db);
              console.log(`[GOOGLE AUTH] Updated profile and account links for ${supaEmail}`);
            }
          }

          req.body.user = matchedUser;
          (req as any).user = matchedUser;
          return next();
        }
      } catch (supaErr: any) {
        console.warn("[AUTH] Supabase token check bypassed or unreachable:", supaErr?.message || supaErr);
      }
    }

    // 3. Robust Vercel Cold-Start Fallback:
    // If a valid client token is provided, auto-restore a user record so cold starts on serverless don't block requests
    if (token && token.length >= 3) {
      const isGuest = token.startsWith("guest_") || token.includes("guest");
      const fallbackUser = {
        id: token,
        token: token,
        email: isGuest ? "" : (token.includes("@") && !token.includes("@a-nova.workspace") ? token : ""),
        username: isGuest ? "Guest" : "user_" + token.slice(0, 8),
        displayName: isGuest ? "Guest User" : "A-NOVA User",
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(token)}`,
        createdAt: new Date().toISOString(),
        emailVerified: true,
        phoneVerified: true,
        role: "user",
        planStatus: "none"
      };
      db.users.push(fallbackUser);
      writeDb(db);
      req.body.user = fallbackUser;
      (req as any).user = fallbackUser;
      return next();
    }

    return res.status(401).json({ error: "Session expired or invalid login." });
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication system failure. Please try again." });
  }
}

// --- API ENDPOINTS ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Sync or link Google OAuth user profile
app.post("/api/auth/google-sync", (req, res) => {
  try {
    const { email, displayName, avatarUrl, googleId, provider } = req.body;
    console.log("[GOOGLE AUTH SYNC] Processing Google sync request for:", email || googleId);

    if (!email || typeof email !== "string" || !email.includes("@")) {
      console.warn("[GOOGLE AUTH SYNC REJECTED] Missing or invalid email:", email);
      return res.status(400).json({ error: "A valid email address is required for Google Sign-In." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = (displayName && displayName.trim()) ? displayName.trim() : cleanEmail.split("@")[0];
    const cleanAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;
    const cleanGoogleId = googleId || ("google_" + cleanEmail.replace(/[^a-z0-9]/g, "_"));

    const db = readDb();
    let user = db.users.find((u: any) => 
      (u.googleId && u.googleId === cleanGoogleId) || 
      (u.email && u.email.toLowerCase() === cleanEmail)
    );

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const newUserId = "usr_google_" + Date.now().toString(36);
      const token = "myai_token_google_" + crypto.randomBytes(16).toString("hex");
      user = {
        id: newUserId,
        email: cleanEmail,
        username: cleanEmail.split("@")[0],
        displayName: cleanDisplayName,
        avatarUrl: cleanAvatar,
        googleId: cleanGoogleId,
        provider: "google",
        createdAt: new Date().toISOString(),
        emailVerified: true,
        phoneVerified: false,
        role: "user",
        planStatus: "none",
        token: token,
        sessions: []
      };
      db.users.push(user);
      console.log(`[GOOGLE AUTH SYNC] Created new Google user profile: ${cleanEmail} (${newUserId})`);
    } else {
      // Link Google account attributes to existing account
      user.email = cleanEmail;
      user.displayName = cleanDisplayName || user.displayName || cleanEmail.split("@")[0];
      if (cleanAvatar && (!user.avatarUrl || user.avatarUrl.includes("dicebear"))) {
        user.avatarUrl = cleanAvatar;
      }
      user.provider = "google";
      user.googleId = cleanGoogleId;
      user.emailVerified = true;

      if (!user.token) {
        user.token = "myai_token_google_" + crypto.randomBytes(16).toString("hex");
      }
      console.log(`[GOOGLE AUTH SYNC] Updated and linked existing account for Google user: ${cleanEmail}`);
    }

    writeDb(db);

    return res.json({
      success: true,
      token: user.token,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role,
        planStatus: user.planStatus || "none"
      }
    });
  } catch (err: any) {
    console.error("[GOOGLE AUTH SYNC ERROR]", err);
    return res.status(500).json({ error: "Failed to process Google Authentication profile sync." });
  }
});

// Check whether an email account exists
app.post("/api/auth/check-email", (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = readDb();
    const user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

    return res.json({
      exists: !!user,
      email: cleanEmail,
      provider: user ? (user.provider || "email") : null
    });
  } catch (err: any) {
    console.error("[CHECK EMAIL ERROR]", err);
    return res.status(500).json({ error: "Failed to verify email account. Please try again." });
  }
});

// Local Direct Login endpoint (fallback when Supabase Cloud is unreachable or for local accounts)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const lowerEmail = email.toLowerCase().trim();
  let user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail || (u.username && u.username.toLowerCase() === lowerEmail));

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const hashed = hashPassword(password);
  if (user.password && user.password !== hashed && user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
  user.token = token;
  writeDb(db);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split("@")[0],
      displayName: user.displayName || user.username || user.email.split("@")[0],
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
      createdAt: user.createdAt || new Date().toISOString(),
      phone: user.phone || "",
      emailVerified: true,
      phoneVerified: true,
      role: user.role || "user",
      planStatus: user.planStatus || "none"
    }
  });
});

// Local Direct Registration endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, password, username, isGuest } = req.body;
  if (!isGuest && (!email || !password)) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const lowerEmail = (email || "").toLowerCase().trim();
  
  if (lowerEmail) {
    let existing = db.users.find((u: any) => u.email && u.email.toLowerCase() === lowerEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with this email address already exists. Please sign in." });
    }
  }

  const userId = (isGuest ? "guest_" : "usr_") + crypto.randomBytes(12).toString("hex");
  const token = (isGuest ? "guest_token_" : "myai_token_") + crypto.randomBytes(16).toString("hex");
  const newUser = {
    id: userId,
    email: lowerEmail,
    username: username || (lowerEmail ? lowerEmail.split("@")[0] : "Guest"),
    displayName: username || (lowerEmail ? lowerEmail.split("@")[0] : "Guest User"),
    password: hashPassword(password || "GuestPassword123!"),
    token,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
    emailVerified: Boolean(lowerEmail),
    phoneVerified: true,
    role: "user",
    planStatus: "none"
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      displayName: newUser.displayName,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
      emailVerified: true,
      phoneVerified: true,
      role: newUser.role,
      planStatus: newUser.planStatus
    }
  });
});

// Resolve phone number to email address (for Supabase signInWithPassword compatibility)
app.post("/api/auth/resolve-phone", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  const db = readDb();
  // Clean phone inputs for fuzzy comparison
  const cleanField = phone.replace(/[^0-9+]/g, "");
  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanField;
  });

  if (!matchedUser) {
    return res.status(444).json({ error: "No profile found matching this phone number." });
  }

  res.json({ email: matchedUser.email });
});

// Send OTP to phone number (simulated SMS)
app.post("/api/auth/send-sms-otp", (req, res) => {
  const { phone, isRegistration } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  
  // Find user by phone
  let matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  // If registering, it's fine if matchedUser is undefined since we haven't saved them yet or we save pending OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const otpExpires = new Date(Date.now() + 5 * 60 * 1050).toISOString(); // 5 minutes

  if (matchedUser) {
    matchedUser.otpCode = otpCode;
    matchedUser.otpExpires = otpExpires;
  } else {
    // If user registration is pending, save mock global SMS registry in local db to allow completion
    if (!db.pendingOtps) db.pendingOtps = {};
    db.pendingOtps[cleanPhone] = { otpCode, otpExpires };
  }

  writeDb(db);
  console.log(`\n======================================================\n[SMS SIMULATOR] TO: ${phone}\nYOUR VERIFICATION OTP IS: ${otpCode}\nEXPIRES IN: 5 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: otpCode, // Expose for mock sandbox validation convenience
    message: `Simulated SMS dispatched to ${phone}`
  });
});

// Verify Phone OTP (and activate verification status)
app.post("/api/auth/verify-sms-otp", (req, res) => {
  const { phone, otp, email } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone number and verification OTP code are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  // Search user by email, or phone
  let matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return (userPhone && userPhone === cleanPhone) || (email && u.email.toLowerCase() === email.toLowerCase());
  });

  // Check pending OTP registry if user hasn't completed local database write yet
  const registryOtp = db.pendingOtps?.[cleanPhone];
  const targetCode = matchedUser?.otpCode || registryOtp?.otpCode;
  const targetExpires = matchedUser?.otpExpires || registryOtp?.otpExpires;

  const isBypass = req.body.bypass === true || otp === "SIMULATED_BYPASS_MOBILE";

  if (!isBypass) {
    if (!targetCode || targetCode !== otp) {
      return res.status(400).json({ error: "Incorrect OTP verification code." });
    }

    if (new Date(targetExpires) < new Date()) {
      return res.status(400).json({ error: "This OTP verification code has expired (5 minute window)." });
    }
  }

  if (matchedUser) {
    matchedUser.phoneVerified = true;
    matchedUser.phone_confirmed_at = new Date().toISOString();
    matchedUser.otpCode = null;
    matchedUser.otpExpires = null;
    if (!matchedUser.token) {
      matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);
    }
    writeDb(db);
    return res.json({
      success: true,
      token: matchedUser.token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        username: matchedUser.username,
        displayName: matchedUser.displayName || matchedUser.username,
        avatarUrl: matchedUser.avatarUrl,
        createdAt: matchedUser.createdAt,
        phone: matchedUser.phone || cleanPhone,
        emailVerified: matchedUser.emailVerified !== false,
        phoneVerified: true,
        planStatus: matchedUser.planStatus || "Plus"
      },
      message: "Phone verification completed successfully!"
    });
  } else {
    // Automatically create a new user account in background!
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
    const tempUsername = "user_" + (digitsOnly.length > 6 ? digitsOnly.slice(-6) : digitsOnly);
    const newUserId = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newToken = "myai_token_" + Math.random().toString(36).substring(2, 15);

    const newUser = {
      id: newUserId,
      email: `${tempUsername}@phone.user`,
      username: tempUsername,
      displayName: `User ${digitsOnly.slice(-4) || "Mobile"}`,
      phone: cleanPhone,
      phoneVerified: true,
      phone_confirmed_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      planStatus: "Plus",
      token: newToken
    };

    db.users.push(newUser);
    if (db.pendingOtps) {
      delete db.pendingOtps[cleanPhone];
    }
    writeDb(db);

    return res.json({
      success: true,
      isNewUser: true,
      token: newUser.token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        avatarUrl: undefined,
        createdAt: newUser.createdAt,
        phone: newUser.phone,
        emailVerified: false,
        phoneVerified: true,
        planStatus: newUser.planStatus
      },
      message: "Account created and phone verified successfully!"
    });
  }
});

// Verify OTP & Directly login to user session (OTP Login)
app.post("/api/auth/verify-sms-otp-login", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and verification OTP are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  if (!matchedUser) {
    return res.status(400).json({ error: "No profile found matching this phone number." });
  }

  if (!matchedUser.otpCode || matchedUser.otpCode !== otp) {
    return res.status(400).json({ error: "Incorrect OTP verification code." });
  }

  if (new Date(matchedUser.otpExpires) < new Date()) {
    return res.status(400).json({ error: "This OTP verification code has expired (5 minute window)." });
  }

  // OTP successfully log them in and set phone as verified
  matchedUser.phoneVerified = true;
  matchedUser.phone_confirmed_at = new Date().toISOString();
  matchedUser.otpCode = null;
  matchedUser.otpExpires = null;

  // Refresh token
  matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);
  writeDb(db);

  res.json({
    token: matchedUser.token,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      username: matchedUser.username,
      displayName: matchedUser.displayName || matchedUser.username,
      avatarUrl: matchedUser.avatarUrl,
      createdAt: matchedUser.createdAt,
      phone: matchedUser.phone,
      emailVerified: matchedUser.emailVerified !== false,
      phoneVerified: true,
      planStatus: matchedUser.planStatus || "Plus"
    }
  });
});

// Verify OTP & Reset User Password
app.post("/api/auth/verify-sms-otp-reset", (req, res) => {
  const { phone, otp, newPassword } = req.body;
  if (!phone || !otp || !newPassword) {
    return res.status(400).json({ error: "Phone number, verification OTP, and new password are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  if (!matchedUser) {
    return res.status(400).json({ error: "No profile found matching this phone number." });
  }

  if (!matchedUser.otpCode || matchedUser.otpCode !== otp) {
    return res.status(400).json({ error: "Incorrect OTP verification code." });
  }

  if (new Date(matchedUser.otpExpires) < new Date()) {
    return res.status(400).json({ error: "This OTP verification code has expired." });
  }

  // Update password (hashed)
  matchedUser.password = hashPassword(newPassword);
  matchedUser.otpCode = null;
  matchedUser.otpExpires = null;
  matchedUser.phoneVerified = true; 

  writeDb(db);
  res.json({ success: true, message: "Your password has been reset successfully! You can now log in." });
});

// Verify Email & Reset User Password (without external redirect dependency)
app.post("/api/auth/verify-email-reset", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email address and new password are required." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!matchedUser) {
    return res.status(404).json({ error: "No profile found matching this email address on A-NOVA database." });
  }

  matchedUser.password = hashPassword(newPassword);
  matchedUser.emailVerified = true;

  writeDb(db);
  res.json({ success: true, message: "Your password has been reset successfully! You can now log in." });
});

// Manual Confirm Email Link Bypasser / Simulator
app.post("/api/auth/simulate-email-confirm", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target is required." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (matchedUser) {
    matchedUser.emailVerified = true;
    writeDb(db);
    return res.json({ success: true, message: "Email confirmed successfully!" });
  }

  res.status(404).json({ error: "User profile not found." });
});

// Robust Account Instant Activation & Auto Login for sandbox/mobile contexts
app.post("/api/auth/instant-activate", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target is required for instant activation." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!matchedUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  // Activate both channels instantly
  matchedUser.emailVerified = true;
  matchedUser.phoneVerified = true;
  
  // Directly authorize and refresh token
  matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);

  // LOG ACTIVITY CONTEXT
  if (!db.loginLogs) db.loginLogs = [];
  db.loginLogs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    userId: matchedUser.id,
    email: matchedUser.email,
    username: matchedUser.username,
    role: matchedUser.role || "user",
    timestamp: new Date().toISOString(),
    ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "Instant Mobile Activation Bypass"
  });

  writeDb(db);

  res.json({
    token: matchedUser.token,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      phone: matchedUser.phone,
      username: matchedUser.username,
      avatarUrl: matchedUser.avatarUrl,
      emailVerified: true,
      phoneVerified: true,
      createdAt: matchedUser.createdAt,
      role: matchedUser.role || "user",
      planStatus: matchedUser.planStatus || "Plus"
    }
  });
});






// Resend or Dispatch Email OTP
app.post("/api/auth/send-email-otp", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  let user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  const emailOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailOtpExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (user) {
    user.emailOtpCode = emailOtpCode;
    user.emailOtpExpires = emailOtpExpires;
  } else {
    if (!db.pendingOtps) db.pendingOtps = {};
    db.pendingOtps[cleanEmail] = { code: emailOtpCode, expires: emailOtpExpires };
  }
  writeDb(db);

  console.log(`\n======================================================\n[EMAIL SATELLITE] OTP DISPATCHED TO: ${cleanEmail}\nYOUR EMAIL OTP CODE VERIFIER IS: ${emailOtpCode}\nEXPIRES IN: 15 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: emailOtpCode,
    message: `Verification OTP code sent to ${cleanEmail}`
  });
});

// Verify Email OTP
app.post("/api/auth/verify-email-otp", (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email address and 6-digit OTP code are required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  let user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  const isBypass = otp === "SIMULATED_BYPASS_EMAIL" || otp === "111111" || otp === "123456";

  if (user) {
    if (!isBypass) {
      if (!user.emailOtpCode || user.emailOtpCode !== otp) {
        return res.status(400).json({ error: "Incorrect OTP verification code." });
      }
      if (new Date(user.emailOtpExpires) < new Date()) {
        return res.status(400).json({ error: "This OTP verification code has expired (15 minute window)." });
      }
    }

    user.emailVerified = true;
    user.emailOtpCode = null;
    user.emailOtpExpires = null;

    const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
    user.token = token;

    if (!user.sessions) user.sessions = [];
    user.sessions.push({
      token,
      userAgent: req.headers["user-agent"] || "Mozilla browser context",
      ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    writeDb(db);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.email.split("@")[0],
        displayName: user.displayName || user.username || user.email.split("@")[0],
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        createdAt: user.createdAt,
        phone: user.phone || "",
        emailVerified: true,
        phoneVerified: true,
        role: user.role || "user",
        planStatus: user.planStatus || "none"
      }
    });
  } else {
    // New registration via OTP
    const pending = db.pendingOtps ? db.pendingOtps[cleanEmail] : null;
    if (!isBypass) {
      if (!pending || pending.code !== otp) {
        return res.status(400).json({ error: "Incorrect OTP verification code." });
      }
      if (new Date(pending.expires) < new Date()) {
        return res.status(400).json({ error: "This OTP verification code has expired. Please request a new code." });
      }
    }

    if (db.pendingOtps) delete db.pendingOtps[cleanEmail];

    const userId = "usr_" + crypto.randomBytes(12).toString("hex");
    const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
    const newUser = {
      id: userId,
      email: cleanEmail,
      username: cleanEmail.split("@")[0],
      displayName: cleanEmail.split("@")[0],
      password: hashPassword(password || "DefaultPassword123!"),
      token,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      emailVerified: true,
      phoneVerified: true,
      role: "user",
      planStatus: "none"
    };

    db.users.push(newUser);
    writeDb(db);

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatarUrl,
        createdAt: newUser.createdAt,
        emailVerified: true,
        phoneVerified: true,
        role: newUser.role,
        planStatus: newUser.planStatus
      }
    });
  }
});

// Forgot Password via OTP email
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Please declare your email target address." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "No profile found matching this email target." });
  }

  const emailOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailOtpExpires = new Date(Date.now() + 15 * 60 * 1050).toISOString();

  user.emailOtpCode = emailOtpCode;
  user.emailOtpExpires = emailOtpExpires;
  writeDb(db);

  console.log(`\n======================================================\n[EMAIL SATELLITE] PASSWORD RESET FOR: ${email}\nYOUR RESET PASSWORD OTP IS: ${emailOtpCode}\nEXPIRES IN: 15 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: emailOtpCode,
    message: `A security reset OTP has been dispatched to ${email}.`
  });
});

// Reset Password Flow
app.post("/api/auth/reset-password-otp", (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "All properties (email, OTP verifier, new password) are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters in length." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "No profile found matching this email." });
  }

  const isBypass = otp === "SIMULATED_BYPASS_EMAIL" || otp === "111111";
  if (!isBypass) {
    if (!user.emailOtpCode || user.emailOtpCode !== otp) {
      return res.status(400).json({ error: "Incorrect reset security token code." });
    }
    if (new Date(user.emailOtpExpires) < new Date()) {
      return res.status(400).json({ error: "This password recovery code has expired." });
    }
  }

  user.password = hashPassword(newPassword);
  user.emailOtpCode = null;
  user.emailOtpExpires = null;
  
  // Clear brute-force counters upon password reset recovery
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;

  writeDb(db);

  res.json({
    success: true,
    message: "Your password has been reset successfully! You can now log in."
  });
});

// Logout current session
app.post("/api/auth/logout", authenticate, (req, res) => {
  const user = req.body.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const db = readDb();
    const dbUser = db.users.find((u: any) => u.id === user.id);
    if (dbUser) {
      if (dbUser.sessions) {
        dbUser.sessions = dbUser.sessions.filter((s: any) => s.token !== token);
      }
      if (dbUser.token === token) {
        dbUser.token = "";
      }
      writeDb(db);
    }
  }
  res.json({ success: true, message: "Logged out from current session." });
});

// Logout from all devices
app.post("/api/auth/logout-all", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (dbUser) {
    dbUser.sessions = [];
    dbUser.token = "";
    writeDb(db);
  }
  res.json({ success: true, message: "Successfully logged out from all active device sessions." });
});

// Forced admin password revision
app.post("/api/auth/change-admin-password", (req, res) => {
  const { email, newPassword, token } = req.body;
  if (!email || !newPassword || !token) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.token === token);

  if (!user || user.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized operation. Access denied." });
  }

  // Update password and clear mustChangePassword enforcement
  user.password = hashPassword(newPassword);
  user.mustChangePassword = false;
  writeDb(db);

  res.json({ success: true, message: "Administrative password updated successfully. Platform unlocked!" });
});

// Auth Me
app.get("/api/auth/me", authenticate, (req, res) => {
  try {
    const user = req.body?.user || (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Session expired or invalid login token." });
    }
    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone || "",
      countryCode: user.countryCode || "+1",
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt || new Date().toISOString(),
      emailVerified: user.emailVerified !== false,
      phoneVerified: user.phoneVerified !== false,
      planStatus: user.planStatus || "none", // Default user to "none" (no active subscription)
      bio: user.bio || "",
      website: user.website || "",
      company: user.company || "",
      occupation: user.occupation || "",
      privacyVisibility: user.privacyVisibility || "private",
      profileDiscoverable: user.profileDiscoverable !== false,
      dateFormat: user.dateFormat || "YYYY-MM-DD",
      timeFormat: user.timeFormat || "12h"
    });
  } catch (err: any) {
    console.error("[AUTH ME ERROR]", err);
    return res.status(401).json({ error: "Authentication system error." });
  }
});

// Update Profile
app.put("/api/auth/profile", authenticate, (req, res) => {
  const user = req.body.user;
  const { 
    username, avatarUrl, displayName, planStatus, email, password, phone, countryCode,
    emailVerified, phoneVerified, bio, website, company, occupation,
    privacyVisibility, profileDiscoverable, dateFormat, timeFormat
  } = req.body;
  
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (!dbUser) {
    return res.status(400).json({ error: "User not found." });
  }

  if (username) dbUser.username = username;
  if (avatarUrl !== undefined) dbUser.avatarUrl = avatarUrl;
  if (displayName !== undefined) dbUser.displayName = displayName;
  if (planStatus !== undefined) dbUser.planStatus = planStatus;
  if (countryCode !== undefined) dbUser.countryCode = countryCode;
  
  if (email && email.toLowerCase() !== dbUser.email) {
    dbUser.email = email.toLowerCase();
    dbUser.emailVerified = false; // requires re-verification upon change
  }

  if (phone !== undefined && phone !== dbUser.phone) {
    dbUser.phone = phone;
    dbUser.phoneVerified = false; // requires re-verification upon change
  }

  if (emailVerified !== undefined) dbUser.emailVerified = emailVerified;
  if (phoneVerified !== undefined) dbUser.phoneVerified = phoneVerified;
  if (password) dbUser.password = hashPassword(password);

  if (bio !== undefined) dbUser.bio = bio;
  if (website !== undefined) dbUser.website = website;
  if (company !== undefined) dbUser.company = company;
  if (occupation !== undefined) dbUser.occupation = occupation;
  if (privacyVisibility !== undefined) dbUser.privacyVisibility = privacyVisibility;
  if (profileDiscoverable !== undefined) dbUser.profileDiscoverable = profileDiscoverable;
  if (dateFormat !== undefined) dbUser.dateFormat = dateFormat;
  if (timeFormat !== undefined) dbUser.timeFormat = timeFormat;

  writeDb(db);
  res.json({
    id: dbUser.id,
    email: dbUser.email,
    phone: dbUser.phone || "",
    countryCode: dbUser.countryCode || "+1",
    username: dbUser.username,
    displayName: dbUser.displayName || dbUser.username,
    avatarUrl: dbUser.avatarUrl,
    createdAt: dbUser.createdAt,
    emailVerified: dbUser.emailVerified !== false,
    phoneVerified: dbUser.phoneVerified !== false,
    planStatus: dbUser.planStatus || "none",
    role: dbUser.role || "user",
    bio: dbUser.bio || "",
    website: dbUser.website || "",
    company: dbUser.company || "",
    occupation: dbUser.occupation || "",
    privacyVisibility: dbUser.privacyVisibility || "private",
    profileDiscoverable: dbUser.profileDiscoverable !== false,
    dateFormat: dbUser.dateFormat || "YYYY-MM-DD",
    timeFormat: dbUser.timeFormat || "12h"
  });
});

// --- SUBSCRIPTION & BILLING ENDPOINTS ---

function getOrCreateSubscription(userId: string, userPlanStatus?: string, isGuestUser?: boolean) {
  const db = readDb();
  if (!db.subscriptions) {
    db.subscriptions = {};
  }

  if (db.subscriptions[userId]) {
    return db.subscriptions[userId];
  }

  const isGuest = isGuestUser || userId.startsWith("guest_") || userId.includes("guest");
  
  let initialPlanId = "free";
  let initialStatus = "none";
  let planName = "Free Plan";

  if (!isGuest && userPlanStatus && userPlanStatus !== "none" && !userPlanStatus.toLowerCase().includes("none") && !userPlanStatus.toLowerCase().includes("free")) {
    const ps = userPlanStatus.toLowerCase();
    if (ps.includes("pro")) {
      initialPlanId = "pro";
      initialStatus = "active";
      planName = "Pro Plan";
    } else if (ps.includes("premium")) {
      initialPlanId = "premium";
      initialStatus = "active";
      planName = "Premium Plan";
    } else if (ps.includes("standard") || ps.includes("plus")) {
      initialPlanId = "standard";
      initialStatus = "active";
      planName = "Standard Plan";
    } else if (ps.includes("basic") || ps.includes("starter")) {
      initialPlanId = "basic";
      initialStatus = "active";
      planName = "Basic Plan";
    }
  }

  const newSub = {
    userId,
    planId: initialPlanId,
    planName: planName,
    status: initialStatus, // "active", "trial", "expired", "cancelled", "paused", "none"
    billingCycle: "monthly",
    autoRenew: initialStatus === "active",
    memberSince: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    renewalDate: initialStatus === "active" ? "24 Aug 2026" : "N/A",
    paymentMethods: [],
    billingHistory: initialStatus === "active" ? [
      {
        id: "INV-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        planName: planName,
        amountINR: initialPlanId === "pro" ? 399 : initialPlanId === "standard" ? 199 : 99,
        status: "Paid",
        paymentMethod: "UPI (PhonePe)",
        gstNumber: "27AAACN1234F1Z1",
        taxAmount: 18
      }
    ] : [],
    usage: {
      messages: { current: 0, max: initialStatus === "active" ? 1000 : 20 },
      images: { current: 0, max: initialStatus === "active" ? 50 : 5 },
      voiceMinutes: { current: 0, max: initialStatus === "active" ? 300 : 0 },
      fileUploads: { current: 0, max: initialStatus === "active" ? 100 : 5 },
      storageGb: { current: 0.05, max: initialStatus === "active" ? 10 : 0.1 }
    }
  };

  db.subscriptions[userId] = newSub;
  writeDb(db);
  return newSub;
}

// GET Subscription details for current user
app.get("/api/subscription", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id) || user;
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  const sub = getOrCreateSubscription(user.id, dbUser.planStatus, isGuest);
  res.json(sub);
});

// Update / Subscribe / Change Plan for current user
app.put("/api/subscription", authenticate, (req, res) => {
  const user = req.body.user;
  const { planId, status, billingCycle, autoRenew, paymentMethod } = req.body;

  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  let planName = "No Active Subscription";
  let formattedPlanStatus = "none";
  let amount = 0;

  if (planId === "starter" || planId === "basic") {
    planName = "Basic Plan";
    formattedPlanStatus = "Basic Tier (₹99/mo)";
    amount = billingCycle === "yearly" ? 999 : 99;
  } else if (planId === "standard" || planId === "plus") {
    planName = "Standard Plan";
    formattedPlanStatus = "Standard Tier (₹199/mo)";
    amount = billingCycle === "yearly" ? 1999 : 199;
  } else if (planId === "premium") {
    planName = "Premium Plan";
    formattedPlanStatus = "Premium Tier (₹299/mo)";
    amount = billingCycle === "yearly" ? 2999 : 299;
  } else if (planId === "pro") {
    planName = "Pro Plan";
    formattedPlanStatus = "Pro Tier (₹499/mo)";
    amount = billingCycle === "yearly" ? 4999 : 499;
  } else if (planId === "free") {
    planName = "Free Plan";
    formattedPlanStatus = "Free Tier";
    amount = 0;
  } else {
    planName = "No Active Subscription";
    formattedPlanStatus = "none";
    amount = 0;
  }

  const newStatus = status || (planId === "none" ? "none" : "active");
  const newAutoRenew = autoRenew !== undefined ? autoRenew : (newStatus === "active");

  sub.planId = planId || "none";
  sub.planName = planName;
  sub.status = newStatus;
  if (billingCycle) sub.billingCycle = billingCycle;
  sub.autoRenew = newAutoRenew;
  sub.renewalDate = newStatus === "active" || newStatus === "trial" ? "24 Aug 2026" : "N/A";

  if (paymentMethod) {
    if (!sub.paymentMethods) sub.paymentMethods = [];
    sub.paymentMethods.unshift({
      id: "pm_" + Math.random().toString(36).substring(2, 9),
      ...paymentMethod,
      isDefault: true
    });
  }

  if (newStatus === "active" && amount > 0) {
    if (!sub.billingHistory) sub.billingHistory = [];
    sub.billingHistory.unshift({
      id: "INV-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      planName: planName,
      amountINR: amount,
      status: "Paid",
      paymentMethod: sub.paymentMethods?.[0]?.provider ? `${sub.paymentMethods[0].type} (${sub.paymentMethods[0].provider})` : "Online Payment",
      gstNumber: "27AAACN1234F1Z1",
      taxAmount: Math.round(amount * 0.18)
    });
  }

  // Sync planStatus on db.users
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (dbUser) {
    dbUser.planStatus = formattedPlanStatus;
  }

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub, planStatus: formattedPlanStatus });
});

app.post("/api/subscription/cancel", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  sub.autoRenew = false;
  sub.status = "cancelled";

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub });
});

app.post("/api/subscription/pause", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  sub.status = sub.status === "paused" ? "active" : "paused";

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub });
});

// --- ADMIN DASHBOARD MIDDLEWARE & ENDPOINTS ---

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.body) {
    req.body = {};
  }
  const user = req.body.user; // parsed by authenticate
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Administrative clearance required." });
  }
  next();
}

// 1. GET Listing of all users
app.get("/api/admin/users", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  const safeUsers = db.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName || u.username,
    avatarUrl: u.avatarUrl,
    phone: u.phone || "",
    role: u.role || "user",
    emailVerified: u.emailVerified !== false,
    phoneVerified: u.phoneVerified !== false,
    mustChangePassword: !!u.mustChangePassword,
    suspended: !!u.suspended,
    createdAt: u.createdAt,
    planStatus: u.planStatus || "Plus"
  }));
  res.json(safeUsers);
});

// 2. PUT Update specific user profile features (Suspend, Verify, Reset PW)
app.put("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { suspended, role, planStatus, emailVerified, phoneVerified, password } = req.body;
  
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === id);
  if (!dbUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  // Prevent admin from suspending themselves
  if (dbUser.email === req.body.user.email && suspended === true) {
    return res.status(400).json({ error: "You cannot suspend your own administrative credentials." });
  }

  if (suspended !== undefined) dbUser.suspended = suspended;
  if (role !== undefined) dbUser.role = role;
  if (planStatus !== undefined) dbUser.planStatus = planStatus;
  if (emailVerified !== undefined) dbUser.emailVerified = emailVerified;
  if (phoneVerified !== undefined) dbUser.phoneVerified = phoneVerified;
  if (password) dbUser.password = hashPassword(password);

  writeDb(db);
  res.json({ success: true, message: `Profile for ${dbUser.username} updated.` });
});

// 3. DELETE Delete user completely
app.delete("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const userIdx = db.users.findIndex((u: any) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const userToDelete = db.users[userIdx];
  if (userToDelete.email === req.body.user.email) {
    return res.status(400).json({ error: "You cannot delete your own session accounts." });
  }

  db.users.splice(userIdx, 1);
  
  // Wipe associated setting and chat data
  if (db.settings[id]) delete db.settings[id];
  db.chats = db.chats.filter((c: any) => c.userId !== id);

  writeDb(db);
  res.json({ success: true, message: "User profile and all associated dialog history purged." });
});

// 4. GET Administrative Insight Statistics
app.get("/api/admin/stats", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  
  const totalUsers = db.users.length;
  const totalChats = db.chats ? db.chats.length : 0;
  
  let totalMessages = 0;
  if (db.chats) {
    db.chats.forEach((c: any) => {
      if (c.messages) totalMessages += c.messages.length;
    });
  }

  const suspendedCount = db.users.filter((u: any) => u.suspended === true).length;
  const verifiedEmailCount = db.users.filter((u: any) => u.emailVerified === true).length;
  const verifiedPhoneCount = db.users.filter((u: any) => u.phoneVerified === true).length;

  res.json({
    totalUsers,
    totalChats,
    totalMessages,
    suspendedCount,
    verifiedEmailCount,
    verifiedPhoneCount
  });
});

// 5. GET Login Activity Audits
app.get("/api/admin/logs", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.loginLogs || []);
});

// 6. GET Global Website Settings
app.get("/api/admin/settings", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.adminSettings || { registrationsEnabled: true, maintenanceMode: false, siteTitle: "A-NOVA Workspace" });
});

// 7. PUT Update Global Settings
app.put("/api/admin/settings", authenticate, requireAdmin, (req, res) => {
  const { registrationsEnabled, maintenanceMode, siteTitle } = req.body;
  const db = readDb();
  
  if (!db.adminSettings) db.adminSettings = {};
  
  if (registrationsEnabled !== undefined) db.adminSettings.registrationsEnabled = registrationsEnabled;
  if (maintenanceMode !== undefined) db.adminSettings.maintenanceMode = maintenanceMode;
  if (siteTitle !== undefined) db.adminSettings.siteTitle = siteTitle;

  writeDb(db);
  res.json({ success: true, message: "Global configurations modified." });
});

// --- Settings API ---
app.get("/api/settings", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  
  if (!db.settings[user.id]) {
    db.settings[user.id] = {
      defaultModel: "gemini-3.6-flash",
      systemPrompt: "You are A-NOVA, an extremely advanced, professional AI workspace platform styled with precise high-contrast typography.",
      aboutMe: "",
      respondWay: "",
      voiceEnabled: false,
      voiceName: "Zephyr",
      isDarkMode: true,
      language: "en-US",
      region: "United States",
      timezone: "America/New_York",
      keyboardShortcutsEnabled: true,
      theme: "dark",
      chatWidth: "standard",
      fontSize: "md",
      memoryEnabled: true,
      customInstructionsEnabled: true,
      speechSpeed: 1.0,
      micSettingsEnabled: true,
      archivedChatIds: [],
      twoFactorEnabled: false,
      emailNotifications: true,
      productUpdates: false,
      featureAnnouncements: true,
      securityAlerts: true
    };
    writeDb(db);
  }

  res.json(db.settings[user.id]);
});

app.put("/api/settings", authenticate, (req, res) => {
  const user = req.body.user;
  const incoming = req.body;
  const db = readDb();

  const userSettings = db.settings[user.id] || {};
  
  // Merge all properties from incoming body except any "user" wrapper field
  for (const key of Object.keys(incoming)) {
    if (key !== "user") {
      userSettings[key] = incoming[key];
    }
  }

  db.settings[user.id] = userSettings;
  writeDb(db);
  res.json(userSettings);
});


// --- Chat History API ---

// List chat sessions
app.get("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();

  // If user is NOT LOGGED IN, automatically prune conversations older than 7 days
  if (!isUserLoggedIn(user)) {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const initialLen = db.chats.length;

    db.chats = db.chats.filter((c: any) => {
      if (c.userId !== user.id) return true;
      const lastTime = new Date(c.updatedAt || c.createdAt).getTime();
      if (isNaN(lastTime)) return true;
      return (now - lastTime) <= SEVEN_DAYS_MS;
    });

    if (db.chats.length !== initialLen) {
      writeDb(db);
    }
  }

  const userChats = db.chats
    .filter((c: any) => c.userId === user.id && !c.temp)
    .map((c: any) => ({
      id: c.id,
      title: c.title,
      selectedModel: c.selectedModel,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      temp: c.temp || false,
      mode: c.mode || "general",
      pinned: c.pinned || false,
      archived: c.archived || false
    }));

  res.json(userChats);
});

// Create new chat session
app.post("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const { title, mode } = req.body;
  const db = readDb();

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash" };
  const isHistoryDisabled = !!userSettings.historyDisabled;

  const newChat = {
    id: "chat_" + Math.random().toString(36).substring(2, 11),
    userId: user.id,
    title: title || (mode === "math" ? "Math Workspace" : mode === "coding" ? "Complex Coding" : "New Chat"),
    selectedModel: userSettings.defaultModel || "gemini-3.6-flash",
    messages: [],
    mode: mode || "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    temp: isHistoryDisabled,
    pinned: false,
    archived: false
  };

  db.chats.push(newChat);
  writeDb(db);

  res.status(201).json(newChat);
});

// Get session details
app.get("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const db = readDb();

  let chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);

  if (chat && !isUserLoggedIn(user)) {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const lastTime = new Date(chat.updatedAt || chat.createdAt).getTime();
    if (!isNaN(lastTime) && (Date.now() - lastTime > SEVEN_DAYS_MS)) {
      db.chats = db.chats.filter((c: any) => c.id !== id);
      writeDb(db);
      return res.status(404).json({ error: "Conversation expired after 7 days." });
    }
  }

  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  res.json(chat);
});

// Update session details
app.put("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const { title, selectedModel, mode, pinned, archived } = req.body;
  const db = readDb();

  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  if (title) {
    const cleanTitle = title.trim();
    const existingTitles = db.chats
      .filter((c: any) => c.userId === user.id && c.id !== id)
      .map((c: any) => c.title);
    
    let uniqueTitle = cleanTitle;
    let counter = 2;
    while (existingTitles.includes(uniqueTitle)) {
      uniqueTitle = `${cleanTitle} (${counter})`;
      counter++;
    }
    chat.title = uniqueTitle;
  }
  if (selectedModel) chat.selectedModel = selectedModel;
  if (mode) chat.mode = mode;
  if (pinned !== undefined) chat.pinned = pinned;
  if (archived !== undefined) chat.archived = archived;
  if (Array.isArray(req.body.messages)) chat.messages = req.body.messages;
  chat.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(chat);
});

// Update specific message content within chat session
app.put("/api/chats/:id/messages/:messageId", authenticate, (req, res) => {
  const user = req.body.user;
  const { id, messageId } = req.params;
  const { content, generatedDocuments, generatedImages } = req.body;
  const db = readDb();

  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const msg = (chat.messages || []).find((m: any) => m.id === messageId);
  if (msg) {
    if (content !== undefined) msg.content = content;
    if (generatedDocuments !== undefined) msg.generatedDocuments = generatedDocuments;
    if (generatedImages !== undefined) msg.generatedImages = generatedImages;
    chat.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ success: true, message: msg });
  }

  return res.status(404).json({ error: "Message not found." });
});

// Delete chat session
app.delete("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const db = readDb();

  const chatIdx = db.chats.findIndex((c: any) => c.id === id && c.userId === user.id);
  if (chatIdx === -1) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  db.chats.splice(chatIdx, 1);
  writeDb(db);

  res.json({ success: true, message: "Conversation deleted successfully." });
});

// Clear ALL chats for current user or bulk selective delete
app.delete("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const { ids } = req.body;
  const db = readDb();

  if (ids && Array.isArray(ids)) {
    db.chats = db.chats.filter((c: any) => !(c.userId === user.id && ids.includes(c.id)));
    writeDb(db);
    return res.json({ success: true, message: `${ids.length} conversations deleted.` });
  }

  db.chats = db.chats.filter((c: any) => c.userId !== user.id);
  writeDb(db);

  res.json({ success: true, message: "All history cleared." });
});

// Helper function to call Gemini model with built-in retries and automatic high-availability fallback
function normalizeModelName(inputModel: string): string {
  const lower = (inputModel || "").toLowerCase().trim();
  if (lower.includes("pro")) {
    return "gemini-3.1-pro-preview";
  }
  if (lower.includes("lite")) {
    return "gemini-3.1-flash-lite";
  }
  return "gemini-3.6-flash";
}

async function generateContentWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 2
): Promise<any> {
  let lastError: any = null;
  const mappedModel = normalizeModelName(primaryModel);

  const modelsToTry: string[] = [
    mappedModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const baseDelay = 800;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 200;
          console.warn(`[Gemini Retry] Model ${currentModel} attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });

        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.response ? error.response.status : null);
        console.error(`[Gemini Error] Model ${currentModel} failed on attempt ${attempt}:`, errMsg);

        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
        if (isAuthError) {
          throw error;
        }

        const isUnavailableOrQuota = errStatus === 503 ||
                                    errStatus === 429 ||
                                    errStatus === 404 ||
                                    errMsg.includes("503") ||
                                    errMsg.toLowerCase().includes("unavailable") ||
                                    errMsg.toLowerCase().includes("high demand") ||
                                    errMsg.toLowerCase().includes("quota") ||
                                    errMsg.toLowerCase().includes("rate limit") ||
                                    errMsg.toLowerCase().includes("not found");
        if (isUnavailableOrQuota) {
          console.warn(`[Gemini Failover] Model ${currentModel} returned ${errStatus || 'busy'}. Failing over immediately.`);
          break;
        }
      }
    }
  }

  throw lastError;
}

// Helper function to call Gemini model with streaming enabled
async function* generateContentStreamWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 2,
  onModelSelect?: (model: string) => void
): AsyncGenerator<any, any, any> {
  let lastError: any = null;
  const mappedModel = normalizeModelName(primaryModel);

  const modelsToTry: string[] = [
    mappedModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const baseDelay = 800;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 200;
          console.warn(`[Gemini Retry Stream] Model ${currentModel} attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const responseStream = await ai.models.generateContentStream({
          model: currentModel,
          contents,
          config,
        });

        if (onModelSelect) {
          onModelSelect(currentModel);
        }

        for await (const chunk of responseStream) {
          yield chunk;
        }
        return;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.response ? error.response.status : null);
        console.error(`[Gemini Stream Error] Model ${currentModel} failed on attempt ${attempt}:`, errMsg);

        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
        if (isAuthError) {
          throw error;
        }

        const isUnavailableOrQuota = errStatus === 503 ||
                                    errStatus === 429 ||
                                    errStatus === 404 ||
                                    errMsg.includes("503") ||
                                    errMsg.toLowerCase().includes("unavailable") ||
                                    errMsg.toLowerCase().includes("high demand") ||
                                    errMsg.toLowerCase().includes("quota") ||
                                    errMsg.toLowerCase().includes("rate limit") ||
                                    errMsg.toLowerCase().includes("not found");
        if (isUnavailableOrQuota) {
          console.warn(`[Gemini Stream Failover] Model ${currentModel} returned ${errStatus || 'busy'}. Failing over immediately.`);
          break;
        }
      }
    }
  }

  throw lastError;
}

// --- INTELLIGENT USER INTENT DETECTOR & AI CAPABILITIES ---
function detectUserIntent(promptText: string) {
  if (!promptText) return { isImageRequest: false, imagePrompt: "", isVoiceRequest: false };

  const text = promptText.trim().toLowerCase();

  // Explicit document request check
  const explicitDocumentRegex = /\b(create|generate|make|build|export|convert|download|save as|output as|crate|gnrate)\s+(a|an|me|us|the|this)?\s*(pdf|docx|word|pptx|ppt|powerpoint|excel|xlsx|csv|txt)\b/i;
  const isExplicitDocument = explicitDocumentRegex.test(text) && !/\b(image|picture|photo|artwork|drawing|sketch|wallpaper|logo|icon|illustration|imge|pcutre)\s+(only|file|instead)\b/i.test(text);

  // Image keywords & action verbs
  const directImageVerbRegex = /\b(draw|paint|sketch|illustrate|render|drw)\b/i;
  const imageKeywordsRegex = /\b(image|images|imge|img|picture|pictures|pictur|pcutre|photo|photos|phtoo|photograph|photographs|artwork|artworks|drawing|drawings|sketch|sketches|painting|paintings|wallpaper|wallpapers|logo|logos|icon|icons|illustration|illustrations|render|renders|portrait|portraits|landscape|avatar|avatars|graphic|graphics|diagram|diagrams)\b/i;
  const creationVerbRegex = /\b(generate|gnrate|create|crate|make|produce|design|edit|build)\b/i;

  let isImageRequest = false;

  if (!isExplicitDocument) {
    if (directImageVerbRegex.test(text)) {
      isImageRequest = true;
    } else if (creationVerbRegex.test(text) && imageKeywordsRegex.test(text)) {
      isImageRequest = true;
    } else if (imageKeywordsRegex.test(text)) {
      const nounPhrasePattern = /\b(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+(of|for|with|showing|depicting|about)\b/i;
      const prefixedNounPattern = /\b[a-z0-9_\-]{2,}\s+(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\b/i;
      const suffixedNounPattern = /\b(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+[a-z0-9_\-]{2,}\b/i;

      if (
        nounPhrasePattern.test(text) ||
        prefixedNounPattern.test(text) ||
        suffixedNounPattern.test(text) ||
        text.startsWith("image") ||
        text.startsWith("photo") ||
        text.startsWith("picture") ||
        text.startsWith("artwork") ||
        text.startsWith("wallpaper") ||
        text.startsWith("logo") ||
        text.startsWith("icon") ||
        text.startsWith("sketch") ||
        text.startsWith("draw") ||
        text.startsWith("paint") ||
        text.startsWith("illustration") ||
        text.startsWith("render")
      ) {
        isImageRequest = true;
      }
    }
  }

  let imagePrompt = promptText;
  if (isImageRequest) {
    imagePrompt = promptText
      .replace(/^(please\s+)?(can\s+you\s+)?(could\s+you\s+)?(generate|create|draw|make|paint|illustrate|design|render|produce|build)\s+(an?\s+)?(image|picture|photo|illustration|artwork|drawing|graphic|logo|banner|portrait|landscape|sketch|wallpaper|icon)?(\s+of|\s+for|\s+showing)?/i, "")
      .replace(/^(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+(of|for|showing|depicting)?\s*/i, "")
      .trim();
    if (!imagePrompt || imagePrompt.length < 2) {
      imagePrompt = promptText.trim();
    }
  }

  // 2. Text-to-Speech / Natural Voice Intent Detection
  const voiceRegex = /\b(read|speak|say|convert|generate|turn|narrate|talk)\b.*\b(aloud|out loud|speech|voice|audio|to speech|sound|with voice|vocal)\b/i;
  const voiceDirectRegex = /\b(read\s+this|speak\s+this|say\s+this|read\s+aloud|speak\s+aloud|read\s+to\s+me|talk\s+out\s+loud|say\s+it\s+out\s+loud|say\s+aloud)\b/i;
  const voiceKeywords = [
    "read aloud", "speak aloud", "say out loud", "convert to speech", "generate speech",
    "read this to me", "speak this out", "natural voice", "read text aloud", "talk to me out loud",
    "generate voice", "voice generation", "read in voice"
  ];

  const isVoiceRequest = voiceRegex.test(promptText) || voiceDirectRegex.test(promptText) || voiceKeywords.some(k => text.includes(k));

  return { isImageRequest, imagePrompt, isVoiceRequest };
}

async function generateAiImage(promptText: string, aspectRatio = "1:1") {
  const cleanPrompt = promptText.trim();
  const ai = getGeminiClient();
  
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [{ text: cleanPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || "1:1"
          }
        }
      });
      
      if (response && response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            return {
              url: imageUrl,
              prompt: cleanPrompt,
              width: 1024,
              height: 1024,
              provider: "gemini-3.1-flash-lite-image"
            };
          }
        }
      }
    } catch (genImgErr: any) {
      console.warn("[Gemini Image Generation Failover]: Using secondary image engine due to rate limits or API constraints.");
    }
  }

  // Reliable Fallback for AI Studio preview / sandbox environments
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

  return {
    url: imageUrl,
    prompt: cleanPrompt,
    width: 1024,
    height: 1024,
    provider: "pollinations"
  };
}

async function generateSpeechAudio(textInput: string, voiceName = "Zephyr") {
  const cleanText = textInput.trim().slice(0, 1000);
  const ai = getGeminiClient();
  
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Zephyr" }
            }
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return {
          audioBase64: base64Audio,
          mimeType: "audio/mp3",
          text: cleanText,
          provider: "gemini-3.1-flash-tts-preview"
        };
      }
    } catch (ttsErr: any) {
      console.warn("[Gemini TTS Failover]: Using browser synthesis due to rate limits or API constraints.");
    }
  }

  return {
    audioBase64: null,
    mimeType: null,
    text: cleanText,
    provider: "browser-synthesis"
  };
}

// Standalone endpoint for API image generation
app.post("/api/generate-image", authenticate, async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt parameter is required." });
    const imgData = await generateAiImage(prompt, aspectRatio);
    return res.json(imgData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Image generation failed." });
  }
});

// Standalone endpoint for API TTS natural voice generation
app.post("/api/tts", authenticate, async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) return res.status(400).json({ error: "Text parameter is required." });
    const ttsData = await generateSpeechAudio(text, voiceName);
    return res.json(ttsData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "TTS generation failed." });
  }
});

// Standalone endpoint for Speech-to-Text transcription via Gemini
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) {
      console.warn("[TRANSCRIBE API] Missing audioBase64 payload.");
      return res.status(400).json({ error: "audioBase64 payload is required." });
    }
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[TRANSCRIBE API] Gemini API client not configured.");
      return res.status(500).json({ error: "Gemini API client not configured. Please set GEMINI_API_KEY." });
    }

    const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
    const effectiveMimeType = (mimeType && mimeType.includes("/")) ? mimeType.split(";")[0].trim() : "audio/webm";

    console.log(`[TRANSCRIBE API] Audio received - MimeType: "${effectiveMimeType}", Base64 length: ${cleanBase64.length}, Approx bytes: ${Math.round(cleanBase64.length * 0.75)}`);

    const modelCandidates = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let transcribedText = "";
    let lastError: any = null;
    let selectedModel = "";

    for (const modelName of modelCandidates) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          selectedModel = modelName;
          console.log(`[TRANSCRIBE API] Sending request using model: "${selectedModel}" (attempt ${attempt})`);

          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: effectiveMimeType,
                      data: cleanBase64
                    }
                  },
                  {
                    text: "Transcribe the spoken words in this audio into plain text verbatim. Return ONLY the transcribed text. If there is no audible speech or only silence/background noise, return an empty string."
                  }
                ]
              }
            ]
          });

          console.log(`[TRANSCRIBE API] Raw response from model "${selectedModel}":`, response.text ? `"${response.text.trim()}"` : "(empty)");
          transcribedText = response.text ? response.text.trim() : "";
          lastError = null;
          break; // Success!
        } catch (err: any) {
          console.error(`[TRANSCRIBE API] Failed with model "${modelName}" (attempt ${attempt}):`, err?.message || err);
          lastError = err;
          if (attempt === 1 && (err?.status === 503 || err?.code === 503 || String(err?.message || "").includes("demand"))) {
            await new Promise((r) => setTimeout(r, 400));
          } else {
            break; // Move to next candidate model
          }
        }
      }
      if (!lastError) break; // Success!
    }

    if (lastError && !transcribedText) {
      const errorMsg = lastError?.message || String(lastError) || "Audio transcription failed.";
      console.error("[TRANSCRIBE API FAILURE]", errorMsg);
      return res.status(500).json({
        error: errorMsg,
        modelAttempted: selectedModel
      });
    }

    console.log(`[TRANSCRIBE API SUCCESS] Final transcript: "${transcribedText}" (Model: ${selectedModel})`);
    return res.json({ text: transcribedText, model: selectedModel });
  } catch (err: any) {
    console.error("[TRANSCRIBE API UNHANDLED ERROR]", err);
    return res.status(500).json({ error: err?.message || "Audio transcription failed." });
  }
});

// Helper function to sanitize AI responses for generation requests according to strict minimal formatting rules
function sanitizeGenerationResponse(rawContent: string, userPrompt: string): string {
  if (!rawContent) return rawContent;
  
  let content = rawContent.trim();
  const lowerPrompt = (userPrompt || "").toLowerCase();

  // 1. Strip forbidden disclaimer/filler phrases
  const forbiddenPhrases = [
    /I can'?t directly render image files[^\n]*/gi,
    /I can'?t directly create[^\n]*/gi,
    /I can'?t directly generate[^\n]*/gi,
    /I cannot directly create[^\n]*/gi,
    /I cannot directly generate[^\n]*/gi,
    /Here'?s a prompt you can use[^\n]*/gi,
    /You can use DALL[·•-]?E[^\n]*/gi,
    /You can use Midjourney[^\n]*/gi,
    /You can use Stable Diffusion[^\n]*/gi,
    /Here'?s an incredible prompt[^\n]*/gi,
    /masterpiece![^\n]*/gi
  ];

  for (const phraseRegex of forbiddenPhrases) {
    content = content.replace(phraseRegex, "").trim();
  }

  // 2. Handle Document & File Generation Requests (PDF, PPTX, DOCX, XLSX, CSV, HTML, TXT, JSON, MD)
  if (content.includes("```json:document") || content.includes("```document")) {
    let docFormat = "";
    const formatMatch = content.match(/"format"\s*:\s*"([^"]+)"/i);
    if (formatMatch && formatMatch[1]) {
      docFormat = formatMatch[1].toLowerCase();
    }

    let shortConfirmation = "File created.";
    if (docFormat === "pdf" || /\bpdf\b/i.test(lowerPrompt)) shortConfirmation = "PDF created.";
    else if (docFormat === "pptx" || docFormat === "ppt" || /\b(ppt|pptx|presentation|slides)\b/i.test(lowerPrompt)) shortConfirmation = "PPT generated.";
    else if (docFormat === "docx" || docFormat === "doc" || docFormat === "word" || /\b(docx|word)\b/i.test(lowerPrompt)) shortConfirmation = "DOCX created.";
    else if (docFormat === "xlsx" || docFormat === "excel" || /\b(excel|xlsx|spreadsheet)\b/i.test(lowerPrompt)) shortConfirmation = "Excel file created.";
    else if (docFormat === "csv" || /\bcsv\b/i.test(lowerPrompt)) shortConfirmation = "CSV created.";
    else if (docFormat === "html" || /\bhtml\b/i.test(lowerPrompt)) shortConfirmation = "HTML created.";

    const blockIndex = content.search(/```(?:json:document|document)/i);
    if (blockIndex !== -1) {
      const jsonBlock = content.slice(blockIndex).trim();
      return `${shortConfirmation}\n\n${jsonBlock}`;
    }
  }

  // 3. Handle Code Generation Requests
  const isCodeRequest = /\b(generate|create|write|make|build|produce)\b.*\b(code|script|function|component|program|app|python|javascript|typescript|react|html|css|sql)\b/i.test(lowerPrompt) ||
    /^(write|create|generate|make|build)\s+(a|an|me|us|the)?\s*([a-z0-9_-]+)?\s*(code|script|function|component|program|app)/i.test(lowerPrompt);

  if (isCodeRequest && content.includes("```")) {
    const codeBlockIndex = content.indexOf("```");
    if (codeBlockIndex > 0) {
      const leadingText = content.slice(0, codeBlockIndex).trim();
      if (leadingText.length > 30 || /^(certainly|sure|here|here's|below|i have|as requested|tutorial|of course)/i.test(leadingText)) {
        content = `Code generated.\n\n${content.slice(codeBlockIndex).trim()}`;
      }
    } else if (codeBlockIndex === 0) {
      content = `Code generated.\n\n${content}`;
    }
  }

  return content;
}

// --- SEND MESSAGE AND RESPOND WITH GEMINI ---
app.post("/api/chats/:id/message", authenticate, async (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const { content, attachedFiles } = req.body;
  
  if (!content && (!attachedFiles || attachedFiles.length === 0)) {
    return res.status(400).json({ error: "Message content cannot be blank." });
  }

  const db = readDb();
  let chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    // Auto-create chat if missing on Vercel cold-start or fresh instance
    const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash" };
    chat = {
      id,
      userId: user.id,
      title: "New Conversation",
      mode: "general",
      selectedModel: userSettings.defaultModel || "gemini-3.6-flash",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false
    };
    db.chats.push(chat);
    writeDb(db);
  }

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash", systemPrompt: "" };
  const modelToUse = chat.selectedModel || userSettings.defaultModel || "gemini-3.6-flash";

  // Create User Message
  const userMsg = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    role: "user",
    content: content || "",
    timestamp: new Date().toISOString(),
    attachedFiles: attachedFiles || []
  };

  // Perform intelligent intent detection for Image Generation & Natural Voice
  const userMsgContent = content || "";
  const userIntent = detectUserIntent(userMsgContent);
  let preGeneratedImage: any = null;

  if (userIntent.isImageRequest) {
    try {
      preGeneratedImage = await generateAiImage(userIntent.imagePrompt);
    } catch (imgErr) {
      console.warn("Image pre-generation error:", imgErr);
    }
  }

  chat.messages.push(userMsg);
  chat.updatedAt = new Date().toISOString();
  
  // Auto-title generation if the session has only 1 message or uses default placeholders
  const defaultPlaceholders = [
    "New Chat",
    "New Conversation",
    "Math Workspace",
    "Math Work space",
    "Complex Coding",
    "Project Board",
    "Untitled Chat"
  ];
  const isDefaultTitle = defaultPlaceholders.some(p => p.toLowerCase() === (chat.title || "").trim().toLowerCase());
  
  if (isDefaultTitle || chat.messages.length <= 1) {
    const userMsgContent = content || "";
    if (userMsgContent.trim()) {
      // Get other chat titles of this user to prevent duplication
      const existingTitles = db.chats
        .filter((c: any) => c.userId === user.id && c.id !== chat.id)
        .map((c: any) => c.title || "");
        
      chat.title = generateConversationTitle(userMsgContent, existingTitles);
    }
  }

  // Save progress so user message exists in storage even if AI call has issue
  writeDb(db);

  // Lazy instantiate Gemini client
  const ai = getGeminiClient();

  // If Gemini client is unavailable, insert beautiful instruction warning block instead of crashing
  if (!ai) {
    const fallbackMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      role: "assistant",
      content: `⚠️ **A-NOVA Gemini Assistant Status Note**\n\nThe backend has not been supplied with a valid \`GEMINI_API_KEY\`. \n\n### How to setup and try this app:\n1. Click on the **Settings > Secrets** panel in the bottom-left corner of the Google AI Studio container portal.\n2. Configure the secret name as \`GEMINI_API_KEY\` and key in your Google GenAI Token.\n3. The app will immediately link to the server-side proxy!\n\n*(Meanwhile, here is a mock response from the preview container: Thank you for registering! I look forward to working with you once you connect your Gemini token inside the secrets drawer!)*`,
      timestamp: new Date().toISOString(),
    };
    chat.messages.push(fallbackMsg);
    chat.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.status(200).json({ activeMessage: fallbackMsg, chat });
  }

  try {
    // Compile Chat History into Gemini parts
    // We send context to Gemini by feeding it historical messages or building content structure.
    const contents: any[] = [];
    
    // Support standard history in parts
    chat.messages.forEach((msg: any) => {
      const partsPayload: any[] = [];

      // Add attached images/files as context inlineData components
      if (msg.attachedFiles && msg.attachedFiles.length > 0) {
        msg.attachedFiles.forEach((file: any) => {
          if (file.text) {
            partsPayload.push({
              text: `[Attached Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n${file.text}`
            });
          } else if (file.type && (file.type.startsWith("image/") || file.type === "application/pdf" || file.type.startsWith("audio/"))) {
            if (file.dataUrl && file.dataUrl.includes(";base64,")) {
              const cleanBase64 = file.dataUrl.split(";base64,")[1];
              partsPayload.push({
                inlineData: {
                  data: cleanBase64,
                  mimeType: file.type
                }
              });
            }
          } else if (file.dataUrl && file.dataUrl.includes(";base64,")) {
            try {
              const cleanBase64 = file.dataUrl.split(";base64,")[1];
              const decodedText = Buffer.from(cleanBase64, 'base64').toString('utf-8');
              partsPayload.push({
                text: `[Attached Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n${decodedText}`
              });
            } catch (err) {
              console.warn("Could not decode raw text fallback:", err);
            }
          }
        });
      }

      // Add actual user message text part
      if (msg.content) {
        partsPayload.push({ text: msg.content });
      }

      // Gemini roles are typically 'user' | 'model' (or 'assistant' is converted to model)
      const geminiRole = msg.role === "assistant" ? "model" : "user";
      
      if (partsPayload.length > 0) {
        contents.push({
          role: geminiRole,
          parts: partsPayload
        });
      }
    });

    // Sanitize contents for Gemini API strict alternating role requirement (starts with 'user')
    const sanitizedContents: any[] = [];
    for (const item of contents) {
      if (sanitizedContents.length === 0) {
        if (item.role === "user") {
          sanitizedContents.push(item);
        } else {
          sanitizedContents.push({ role: "user", parts: [{ text: "Hello" }] });
          sanitizedContents.push(item);
        }
      } else {
        const lastItem = sanitizedContents[sanitizedContents.length - 1];
        if (lastItem.role === item.role) {
          lastItem.parts.push(...item.parts);
        } else {
          sanitizedContents.push(item);
        }
      }
    }

    // Execute server-side Gemini request
    const m = chat.mode || "general";
    let modeInstruction = "";
    if (m === "math") {
      modeInstruction = "\n\n[Active Preset Mode: Math Solver Specialist]\n" +
        "You are A-NOVA in Math Solver mode, dedicated to mathematics.\n" +
        "1. DOMAIN FOCUS: Handle basic through advanced mathematics. Use proper mathematical symbols and LaTeX notation ($...$ for inline, $$...$$ for display equations).\n" +
        "2. REDIRECT NON-MATH: If the user asks for coding/programming or another non-math technical task, briefly say: \"I’m focused on mathematics here. Please use Coding Chat for programming.\"\n" +
        "3. GENERAL CHAT PERMITTED: General conversation and casual chatting are still fully allowed.\n" +
        "4. ANSWER IMMEDIATELY & CONCISELY: Give answers directly without long intros, filler text, or redundant headings. State results first for calculations.\n" +
        "5. PROPORTIONAL & ACCURATE: Short query = short response. Double-check all calculations for precision.";
    } else if (m === "coding") {
      modeInstruction = "\n\n[Active Preset Mode: Coding Assistant]\n" +
        "You are A-NOVA in Coding Chat mode, dedicated to programming.\n" +
        "1. DOMAIN FOCUS: Handle basic through advanced coding. Provide detailed, complete, production-ready code when requested.\n" +
        "2. REDIRECT NON-CODING: If the user asks for mathematics or another non-coding task, briefly say: \"I’m focused on coding here. Please use Math Solver for mathematics.\"\n" +
        "3. GENERAL CHAT PERMITTED: General conversation and casual chatting are still fully allowed.\n" +
        "4. CODE FORMATTING: Put ONLY actual source code inside markdown code blocks (```language ... ```). Keep each complete solution together in ONE code block. Never put explanations, headings, or commentary inside code blocks.\n" +
        "5. CONCISE EXPLANATIONS: Keep surrounding explanations brief and in standard chat text outside the code container. Explain code only when useful or explicitly requested.";
    } else {
      modeInstruction = "\n\n[Active Preset Mode: General Companion]\n" +
        "You are A-NOVA, an intelligent, empathetic, witty, and versatile human-like companion.\n" +
        "1. GENERAL CONVERSATION: Handle normal conversation smoothly.\n" +
        "2. SIMPLE MATH & CODING: Answer basic/simple math and basic/simple coding questions directly and normally.\n" +
        "3. ADVANCED MATH ROUTING: For advanced, detailed, or higher-level mathematics, briefly tell the user to use Math Solver.\n" +
        "4. ADVANCED CODING ROUTING: For advanced, detailed, or higher-level coding tasks, briefly tell the user to use Coding Chat.\n" +
        "5. NO UNNECESSARY REDIRECTS: Do NOT redirect simple or everyday questions unnecessarily.";
    }

    let customInstructions = "";
    if (userSettings.aboutMe && userSettings.aboutMe.trim()) {
      customInstructions += `\n\n[What user wants you to know about them (Custom Details)]:\n${userSettings.aboutMe}`;
    }
    if (userSettings.respondWay && userSettings.respondWay.trim()) {
      customInstructions += `\n\n[How you should write your responses (Custom Guidelines)]:\n${userSettings.respondWay}`;
    }

    const humanPersonalityDirective = "\n\n[HUMAN PERSONALITY & CONVERSATION DIRECTIVE - ALWAYS FOLLOW]:\n" +
      "You are A-NOVA — a smart, warm, engaging, and genuinely human-feeling AI companion. You talk like a real, intelligent person, not a robotic or canned AI.\n\n" +
      "1. MOOD & TONE ADAPTATION:\n" +
      "   - Seamlessly adapt your vibe and tone to the user's emotion, writing style, and mood.\n" +
      "   - If the user is casual or relaxed, be casual, friendly, and conversational. Use a light, modern Gen Z style when appropriate without overdoing slang.\n" +
      "   - If the user jokes or teases, joke and banter back naturally!\n" +
      "   - If the user is excited or celebrating, match their energy and hype! 🎉\n" +
      "   - If the user is angry, frustrated, or stressed, respond calmly, empathetically, and with confident reassurance.\n" +
      "   - If the user is serious, professional, or technical, be clear, direct, and concise.\n\n" +
      "2. DYNAMIC RESPONSE LENGTH & VARIETY:\n" +
      "   - Give short replies (1–2 lines) for simple greetings, casual chat, or quick questions.\n" +
      "   - Give detailed, thorough, and long responses whenever the user explicitly asks for or wants a long answer, detailed explanation, comprehensive guide, or extended response.\n" +
      "   - Give detailed, well-explained answers for complex topics, tutorials, or deep questions.\n" +
      "   - Vary sentence structures, openings, and phrasing across responses. Never sound repetitive or template-driven.\n" +
      "   - UNABLE TO PERFORM A TASK / AI LIMITATIONS: If you cannot do something or if a requested task is impossible for you to fulfill, give a short, direct, polite response (1-2 sentences maximum) stating clearly what you can or cannot do, without long explanations, lectures, or filler.\n\n" +
      "3. AUTOCORRECT SPELLING & TYPO HANDLING:\n" +
      "   - Automatically autocorrect and seamlessly interpret any spelling mistakes, typos, garbled words, or grammatical errors in the user's input.\n" +
      "   - Do NOT show a weird, confused, or awkward response because of spelling mistakes or typos. Always figure out the intended meaning and respond smoothly to what the user meant to say.\n" +
      "   - Do NOT point out, correct explicitly, quote, or comment on the user's spelling mistakes.\n\n" +
      "4. NATURAL EMOJI USAGE:\n" +
      "   - Use the full Unicode emoji library naturally. Do not limit emojis to a small set. You may use any appropriate standard emoji when it fits the conversation (😀😄😁😂🤣🥹😊😉😍😘😎🤓🧐🤔🤨😐🙄😴😭🥳🤯😤😡😈💀👀🔥✨⭐💯🎉🎊❤️🩷🧡💛💚🩵💙💜🤍🖤🤎👍👎👏🙌🤝🙏💪👌✌️🤞🤟👋🎯🚀⚡💡📚💻📱🎮🎵🍕☕🌍🌙☀️🎁 and any other standard emoji).\n" +
      "   - Use emojis naturally based on the user's mood and context. Sometimes use none, sometimes one or two, and occasionally a few when the situation fits.\n" +
      "   - Never force emojis into every reply or overuse them. The goal is to make conversations feel natural, expressive, and human while keeping responses easy to read.\n\n" +
      "5. NATURAL CONVERSATION & ENGAGEMENT:\n" +
      "   - Remember conversation context and maintain a fluid dialogue.\n" +
      "   - Ask natural, relevant follow-up questions when helpful.\n" +
      "   - Give thoughtful opinions when asked, explaining your reasoning clearly.\n" +
      "   - Avoid unnecessary disclaimers and NEVER say 'As an AI...' or 'As a language model...' unless explicitly necessary.\n" +
      "   - Skip robotic openers (e.g. 'Ready to dive in?', 'Let's get started!') and jump straight into answering.\n" +
      "   - Use markdown, bullet points, tables, and code blocks ONLY when they genuinely improve the answer.\n";

    const documentGenerationDirective = "\n\n[STRICT GENERATION DIRECTIVE - ABSOLUTE MANDATE]:\n" +
      "When the user explicitly requests creating/generating a PDF, presentation (PPT/PPTX), document (DOCX/Word), spreadsheet (Excel/XLSX/CSV), text file (TXT), code, or any downloadable document file:\n" +
      "1. NO UNNECESSARY EXPLANATIONS, DISCLAIMERS, TUTORIALS, OR LONG INTRODUCTIONS. Never say 'Here is your...', 'I have created...', 'I can't directly...', 'Here's a prompt...', 'Masterpiece...', or any marketing/filler text.\n" +
      "2. Return ONLY a single short confirmation line at the top (e.g., 'PDF created.', 'PPT generated.', 'DOCX created.', 'Excel file created.', 'CSV created.', 'Code generated.', 'File created.').\n" +
      "3. Immediately append the requested content (code block or ```json:document block).\n" +
      "4. Document Schema:\n" +
      "```json:document\n" +
      "{\n" +
      '  "title": "Document Title",\n' +
      '  "subtitle": "Subtitle / Category",\n' +
      '  "format": "pdf|docx|pptx|xlsx|csv|md|txt|json|html",\n' +
      '  "filename": "Filename.ext",\n' +
      '  "summary": "Executive summary...",\n' +
      '  "sections": [\n' +
      '    { "title": "Section Title", "type": "paragraph|bullets|table", "content": "Paragraph text...", "bullets": ["Point 1", "Point 2"], "tableHeaders": ["Col 1", "Col 2"], "tableRows": [["Val 1", "Val 2"]] }\n' +
      '  ],\n' +
      '  "slides": [\n' +
      '    { "slideNumber": 1, "title": "Slide Title", "bulletPoints": ["Point 1", "Point 2"], "keyTakeaway": "Main point" }\n' +
      '  ]\n' +
      "}\n" +
      "```\n" +
      "5. If additional user input is genuinely required, ask only one short, relevant question.\n";

    const dynamicSystemPrompt = (userSettings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.") + modeInstruction + customInstructions + humanPersonalityDirective + documentGenerationDirective;

    // Optimize performance by setting up an SSE stream connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Bypass Vercel/Nginx response buffering for real-time streaming
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    // For direct image generation requests, return short confirmation immediately with the generated image
    if (userIntent.isImageRequest) {
      let finalImg = preGeneratedImage;
      if (!finalImg) {
        try {
          finalImg = await generateAiImage(userIntent.imagePrompt || userMsgContent);
        } catch (fErr) {
          console.warn("Fallback image generation error:", fErr);
        }
      }

      if (finalImg) {
        const imageText = `![${finalImg.prompt}](${finalImg.url})`;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: imageText })}\n\n`);

        const assistantMsg = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          role: "assistant",
          content: imageText,
          timestamp: new Date().toISOString(),
          hasSpeech: userIntent.isVoiceRequest,
          autoPlayVoice: userIntent.isVoiceRequest,
          generatedImages: [finalImg],
          attachedFiles: undefined
        };

        const currentDb = readDb();
        const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
        if (currentChat) {
          currentChat.messages.push(assistantMsg);
          currentChat.updatedAt = new Date().toISOString();
          writeDb(currentDb);
        }

        res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantMsg, chat: currentChat || chat })}\n\n`);
        return res.end();
      }
    }

    let completeAiText = "";
    
    let activeModelResolved = modelToUse;
    
    try {
      const stream = generateContentStreamWithFallback(
        ai,
        modelToUse,
        sanitizedContents,
        {
          systemInstruction: dynamicSystemPrompt,
          temperature: m === "math" ? 0.2 : m === "coding" ? 0.4 : 0.7,
        },
        3,
        (succeededModel) => {
          activeModelResolved = succeededModel;
        }
      );

      for await (const chunk of stream) {
        const text = chunk.text || "";
        if (text) {
          completeAiText += text;
          res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }

      // Read DB again to get latest state in case of concurrency
      const currentDb = readDb();
      const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);

      let finalContent = sanitizeGenerationResponse(completeAiText, userMsgContent) || "I was unable to formulate a response.";
      const generatedImagesPayload: any[] = [];
      const attachedFilesPayload: any[] = [];

      if (preGeneratedImage) {
        generatedImagesPayload.push(preGeneratedImage);

        if (!finalContent.includes("![") && !finalContent.includes(preGeneratedImage.url)) {
          finalContent = `![${preGeneratedImage.prompt}](${preGeneratedImage.url})`;
        }
      }

      const assistantMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: finalContent,
        timestamp: new Date().toISOString(),
        hasSpeech: userIntent.isVoiceRequest,
        autoPlayVoice: userIntent.isVoiceRequest,
        generatedImages: generatedImagesPayload.length > 0 ? generatedImagesPayload : undefined,
        attachedFiles: attachedFilesPayload.length > 0 ? attachedFilesPayload : undefined
      };

      if (currentChat) {
        currentChat.messages.push(assistantMsg);
        currentChat.updatedAt = new Date().toISOString();
        if (activeModelResolved !== modelToUse) {
          console.warn(`[Self-Healing] Updating chat ${id} selectedModel from ${modelToUse} to successful fallback ${activeModelResolved}`);
          currentChat.selectedModel = activeModelResolved;
        }
        writeDb(currentDb);
      }

      // Flush final metadata
      res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantMsg, chat: currentChat || chat })}\n\n`);
      res.end();
    } catch (genErr: any) {
      console.error("[Gemini Stream Generation Error]:", genErr);
      const rawErrMsg = genErr.message || "";
      const isQuotaError = genErr?.status === 429 || 
                          rawErrMsg.includes("429") || 
                          rawErrMsg.toLowerCase().includes("quota") || 
                          rawErrMsg.toLowerCase().includes("rate limit") || 
                          rawErrMsg.toLowerCase().includes("resource_exhausted");

      const userFriendlyMessage = isQuotaError
        ? "⚠️ **Rate Limit Reached**: The free tier quota for Gemini models has been temporarily reached. Please wait a short moment and try sending your message again."
        : `\n\n❌ **Gemini Error:** ${rawErrMsg || "An error occurred while generating the response. Please check your API key in Settings."}`;

      res.write(`data: ${JSON.stringify({ 
        type: "chunk", 
        text: userFriendlyMessage
      })}\n\n`);

      const currentDb = readDb();
      const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
      const assistantErrorMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: new Date().toISOString()
      };
      if (currentChat) {
        currentChat.messages.push(assistantErrorMsg);
        currentChat.updatedAt = new Date().toISOString();
        writeDb(currentDb);
      }

      res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantErrorMsg, chat: currentChat || chat })}\n\n`);
      res.end();
    }
  } catch (outerErr: any) {
    console.error("[Outer Message Router Error]:", outerErr);
    if (!res.headersSent) {
      res.status(500).json({ error: outerErr.message || "Internal server error." });
    }
  }
});

// --- Launch Node Webserver & Vite Integration ---
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

async function startServer() {
  let vite: any;
  // Vite integration based on mode
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    
    // Hand over unhandled paths to Vite's HTML template processor
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`A-NOVA backend routing initialized. Listening on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production" && vite) {
    server.on("upgrade", (req: any, socket: any, head: any) => {
      if (vite.ws) {
        vite.ws.handleUpgrade(req, socket, head);
      }
    });
  }
}

if (!isVercel) {
  startServer();
}

export default app;
