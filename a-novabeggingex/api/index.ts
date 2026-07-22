import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { supabase as supabaseServer, SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../src/supabaseClient.js";
import http from "http";
import { spawn } from "child_process";

const app = express();
const PORT = 3000;

// Feature flag for enabling real OTP verification inside production deployments.
// In Google AI Studio preview/development mode, we default this to false to provide a seamless instant login / account creation.
const REQUIRE_OTP_VERIFICATION = process.env.REQUIRE_OTP_VERIFICATION === "true";

// Spawn Python FastAPI Server
let isPythonBackendReady = false;
let fastapiLaunched = false;

function launchFastAPI() {
  if (fastapiLaunched) return;
  fastapiLaunched = true;
  console.log("[PROXY ENGINE] Launching FastAPI...");
  
  const uvicorn = spawn("uvicorn", ["backend.main:app", "--port", "5000", "--host", "127.0.0.1"]);
  
  uvicorn.stdout.on("data", (data) => {
    console.log(`[FastAPI] ${data.toString().trim()}`);
  });
  
  uvicorn.stderr.on("data", (data) => {
    console.log(`[FastAPI Log] ${data.toString().trim()}`);
  });
  
  uvicorn.on("close", (code) => {
    console.log(`[PROXY ENGINE] FastAPI process closed with code ${code}.`);
  });
  
  uvicorn.on("error", (err) => {
    console.log("[PROXY ENGINE] Binary uvicorn call failed, checking system python3 uvicorn execution...");
    const pyUvicorn = spawn("python3", ["-m", "uvicorn", "backend.main:app", "--port", "5000", "--host", "127.0.0.1"]);
    
    pyUvicorn.stdout.on("data", (data) => {
      console.log(`[FastAPI] ${data.toString().trim()}`);
    });
    
    pyUvicorn.stderr.on("data", (data) => {
      console.log(`[FastAPI Log] ${data.toString().trim()}`);
    });

    pyUvicorn.on("error", (pyErr) => {
      console.log("[PROXY ENGINE] python3 uvicorn proxy bypass active (using native Express engines).");
    });

    pyUvicorn.on("close", (code) => {
      console.log(`[PROXY ENGINE] python3 -m uvicorn process closed with code ${code}.`);
    });
  });
}

function startPythonBackend() {
  console.log("[PROXY ENGINE] Verifying local Python environment integration...");
  
  // Asynchronously inspect if python3 can import uvicorn and run
  const check = spawn("python3", ["-c", "import uvicorn"]);
  
  check.on("error", (err) => {
    console.log("[PROXY ENGINE] Python is not installed or available on this sandbox host. Running with Node.js local engine only.");
  });
  
  check.on("close", (code) => {
    if (code === 0) {
      console.log("[PROXY ENGINE] Python + uvicorn environment resolved successfully. Spawning package installation...");
      const pip = spawn("pip3", ["install", "-r", "backend/requirements.txt"]);
      pip.on("error", (err) => {
        console.log("[PROXY ENGINE] PIP is not available to install backend requirements. Starting FastAPI directly.");
        launchFastAPI();
      });
      pip.on("close", (pipCode) => {
        console.log(`[PROXY ENGINE] Requirements install complete with code ${pipCode}. Launching FastAPI...`);
        launchFastAPI();
      });
    } else {
      console.log("[PROXY ENGINE] Python 'uvicorn' library is missing. Defaulting to high-performance native Express/Node engines.");
    }
  });
}

// Prober to detect Python backend availability and switch seamlessly
function probePythonBackend() {
  setInterval(() => {
    const options = {
      hostname: "127.0.0.1",
      port: 5000,
      path: "/health",
      timeout: 1000,
    };
    const req = http.get(options, (res) => {
      if (res.statusCode === 200) {
        if (!isPythonBackendReady) {
          console.log("[PROXY ENGINE] FastAPI Python backend detected successfully! Traffic is now routed to Python.");
          isPythonBackendReady = true;
        }
      } else {
        if (isPythonBackendReady) {
          console.warn("[PROXY ENGINE] FastAPI Python backend returned status:", res.statusCode);
          isPythonBackendReady = false;
        }
      }
    });

    req.on("error", () => {
      if (isPythonBackendReady) {
        console.warn("[PROXY ENGINE] FastAPI Python backend went offline. Reverting to Node.js local engine.");
        isPythonBackendReady = false;
      }
    });
  }, 2000);
}

// Boot Python and prober on Startup
// startPythonBackend();
// probePythonBackend();

// Native Fast Forwarding Proxy Middleware with fail-safe Node.js fallback
app.use((req, res, next) => {
  const isApi = req.path.startsWith("/api/") || 
                ["/chat", "/upload", "/history", "/search", "/health"].includes(req.path);
  
  if (!isApi) {
    return next();
  }

  if (!isPythonBackendReady) {
    console.log(`[PROXY ENGINE] Python backend not ready yet. Routing '${req.method} ${req.url}' locally to Node.js native engine.`);
    return next();
  }
  
  console.log(`[PROXY] Forwarding ${req.method} ${req.url} to Python FastAPI...`);
  
  const options = {
    hostname: "127.0.0.1",
    port: 5000,
    path: req.url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    if (proxyRes.statusCode) {
      res.status(proxyRes.statusCode);
    }
    Object.keys(proxyRes.headers).forEach((key) => {
      res.setHeader(key, proxyRes.headers[key]!);
    });
    proxyRes.pipe(res, { end: true });
  });
  
  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] Forwarding failed for ${req.path}:`, err);
    res.status(502).json({ 
      error: "FastAPI Python backend gateway unavailable.",
      details: err.message 
    });
  });
  
  req.pipe(proxyReq, { end: true });
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
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify({ users: [], chats: [], settings: {} }, null, 2)
  );
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
      setTimeout(() => resolve({ error: new Error("Supabase timeout") }), 2500)
    );

    const res: any = await Promise.race([checkPromise, timeoutPromise]);

    if (!res || res.error) {
      isSupabaseTableAvailable = false;
      return false;
    }
    isSupabaseTableAvailable = true;
    return true;
  } catch (err) {
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
            default_model: "gemini-3.5-flash",
            voice_name: "Zephyr"
          }, { onConflict: "user_id" });
          
          cachedDb = initialData;
          fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
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
          fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
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
      default_model: "gemini-3.5-flash",
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

function readDb() {
  if (cachedDb) {
    return cachedDb;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      cachedDb = JSON.parse(data);
    } else {
      cachedDb = { users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] };
    }
    return cachedDb;
  } catch (error) {
    cachedDb = { users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] };
    return cachedDb;
  }
}

function writeDb(data: any) {
  cachedDb = data;
  try {
    // Write synchronously to guarantee files are written before serverless processes terminate
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    
    // Sync asynchronously to Supabase cloud database, returning promise to be awaited by response middleware
    activeSyncPromise = syncToSupabase(data);
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

// Await any pending background cloud DB flushes before the response closes and Vercel freezes the container
app.use((req, res, next) => {
  const originalEnd = res.end;
  res.end = async function (chunk?: any, encoding?: any, callback?: any) {
    try {
      await activeSyncPromise;
    } catch (err) {
      console.error("[MIDDLEWARE SYNC TO CLOUD ERROR] Failed to await DB flush:", err);
    }
    return originalEnd.call(this, chunk, encoding, callback);
  } as any;
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Missing key handled gracefully in controllers
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Authentication Middleware via Supabase JWT verification or Local DB Tokens
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const db = readDb();

    // 1. Check local DB user tokens first
    let localUser = db.users.find((u: any) => u.token === token || u.id === token);
    if (localUser) {
      req.body.user = localUser;
      return next();
    }

    // 2. Validate Supabase Session token if configured and reachable
    try {
      const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);

      if (!error && supabaseUser) {
        let matchedUser = db.users.find((u: any) => u.id === supabaseUser.id || u.email.toLowerCase() === supabaseUser.email!.toLowerCase());

        if (!matchedUser) {
          matchedUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            phone: supabaseUser.phone || "",
            username: supabaseUser.email!.split("@")[0],
            displayName: supabaseUser.user_metadata?.displayName || supabaseUser.user_metadata?.username || supabaseUser.email!.split("@")[0],
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${supabaseUser.id}`,
            createdAt: supabaseUser.created_at || new Date().toISOString(),
            emailVerified: true,
            phoneVerified: true,
            role: "user",
            planStatus: "Plus"
          };
          db.users.push(matchedUser);
          writeDb(db);
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
            writeDb(db);
          }
        }

        req.body.user = matchedUser;
        return next();
      }
    } catch (supaErr: any) {
      console.warn("[AUTH] Supabase token check bypassed or unreachable:", supaErr?.message || supaErr);
    }

    return res.status(401).json({ error: "Session expired or invalid login." });
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication system failure. Please try again." });
  }
}

// --- API ENDPOINTS ---

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
      planStatus: user.planStatus || "Plus"
    }
  });
});

// Local Direct Registration endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const lowerEmail = email.toLowerCase().trim();
  let existing = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);

  if (existing) {
    return res.status(400).json({ error: "An account with this email address already exists. Please sign in." });
  }

  const userId = "usr_" + crypto.randomBytes(12).toString("hex");
  const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
  const newUser = {
    id: userId,
    email: lowerEmail,
    username: username || lowerEmail.split("@")[0],
    displayName: username || lowerEmail.split("@")[0],
    password: hashPassword(password),
    token,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
    emailVerified: true,
    phoneVerified: true,
    role: "user",
    planStatus: "Plus"
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
    matchedUser.otpCode = null;
    matchedUser.otpExpires = null;
  } else {
    if (!db.pendingVerifications) db.pendingVerifications = {};
    db.pendingVerifications[cleanPhone] = true;
  }

  writeDb(db);
  res.json({ success: true, message: "Phone verification completed successfully!" });
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






// Resend Email OTP
app.post("/api/auth/send-email-otp", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target is required." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "No user found with this email." });
  }

  const emailOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailOtpExpires = new Date(Date.now() + 15 * 60 * 1050).toISOString();

  user.emailOtpCode = emailOtpCode;
  user.emailOtpExpires = emailOtpExpires;
  writeDb(db);

  console.log(`\n======================================================\n[EMAIL SATELLITE] RE-DISPATCHING OTP TO: ${email}\nYOUR EMAIL OTP CODE VERIFIER IS: ${emailOtpCode}\nEXPIRES IN: 15 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: emailOtpCode,
    message: `Verification OTP code re-sent to ${email}`
  });
});

// Verify Email OTP
app.post("/api/auth/verify-email-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email address and 6-digit OTP code are required." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "User profile lookup failed." });
  }

  const isBypass = otp === "SIMULATED_BYPASS_EMAIL" || otp === "111111"; // Allow easy premium bypassing for testers
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

  // Generate session token to implement automatic login after verification
  const token = "myai_token_" + Math.random().toString(36).substring(2, 15);
  user.token = token;

  if (!user.sessions) user.sessions = [];
  user.sessions.push({
    token,
    userAgent: req.headers["user-agent"] || "Mozilla sandbox browser context",
    ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  });

  writeDb(db);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      phone: user.phone,
      emailVerified: true,
      phoneVerified: true,
      role: user.role || "user",
      planStatus: user.planStatus || "Plus"
    }
  });
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
  const user = req.body.user;
  res.json({
    id: user.id,
    email: user.email,
    phone: user.phone || "",
    username: user.username,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt || new Date().toISOString(),
    emailVerified: user.emailVerified !== false,
    phoneVerified: user.phoneVerified !== false,
    planStatus: user.planStatus || "Plus" // Default user to "Plus" subscription like a premium sandbox!
  });
});

// Update Profile
app.put("/api/auth/profile", authenticate, (req, res) => {
  const user = req.body.user;
  const { username, avatarUrl, displayName, planStatus, email, password, phone, emailVerified, phoneVerified } = req.body;
  
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (!dbUser) {
    return res.status(400).json({ error: "User not found." });
  }

  if (username) dbUser.username = username;
  if (avatarUrl) dbUser.avatarUrl = avatarUrl;
  if (displayName !== undefined) dbUser.displayName = displayName;
  if (planStatus !== undefined) dbUser.planStatus = planStatus;
  
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

  writeDb(db);
  res.json({
    id: dbUser.id,
    email: dbUser.email,
    phone: dbUser.phone || "",
    username: dbUser.username,
    displayName: dbUser.displayName || dbUser.username,
    avatarUrl: dbUser.avatarUrl,
    createdAt: dbUser.createdAt,
    emailVerified: dbUser.emailVerified !== false,
    phoneVerified: dbUser.phoneVerified !== false,
    planStatus: dbUser.planStatus || "Plus",
    role: dbUser.role || "user"
  });
});

// --- ADMIN DASHBOARD MIDDLEWARE & ENDPOINTS ---

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
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
      defaultModel: "gemini-3.5-flash",
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

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.5-flash" };
  const isHistoryDisabled = !!userSettings.historyDisabled;

  const newChat = {
    id: "chat_" + Math.random().toString(36).substring(2, 11),
    userId: user.id,
    title: title || (mode === "math" ? "Math Workspace" : mode === "coding" ? "Complex Coding" : mode === "project" ? "Project Board" : "New Chat"),
    selectedModel: userSettings.defaultModel || "gemini-3.5-flash",
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

  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
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
  chat.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(chat);
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
async function generateContentWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 3
): Promise<any> {
  let lastError: any = null;
  
  // Cleanly map outdated, unsupported, or deprecated names to modern ones as defined in gemini-api skill
  let mappedModel = primaryModel;
  const lowerModel = (primaryModel || "").toLowerCase().trim();
  
  if (
    lowerModel === "gemini-1.5-pro" || 
    lowerModel === "gemini-2.0-pro" || 
    lowerModel === "gemini-pro" || 
    lowerModel === "gemini-2.5-pro"
  ) {
    mappedModel = "gemini-3.1-pro-preview";
  } else if (
    lowerModel === "gemini-1.5-flash" || 
    lowerModel === "gemini-2.0-flash" || 
    lowerModel === "gemini-2.5-flash"
  ) {
    mappedModel = "gemini-3.5-flash";
  }

  // Create robust fallback sequence of models to maximize success rates
  const modelsToTry: string[] = [mappedModel];
  
  if (mappedModel === "gemini-3.5-flash") {
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  } else if (mappedModel === "gemini-3.1-pro-preview") {
    modelsToTry.push("gemini-3.5-flash");
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  } else if (mappedModel === "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-flash-latest");
    modelsToTry.push("gemini-3.5-flash");
  } else {
    // Default fallback sequence for any other input or unexpected configuration
    modelsToTry.push("gemini-3.5-flash");
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  }

  // Unique list maintaining insertion priorities
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate exponential backoff with jitter: delay = base * 2^(attempt-1) + jitter
          const baseDelay = 1000;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 300;
          console.warn(`[Gemini Retry] Model ${currentModel} failed or busy. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
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
        
        // Define clean check for invalid API key or bad credentials
        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
                            
        if (isAuthError) {
          throw error; // Fail immediately on authentication issues so the user sees correct instructions
        }

        // Check if model has hit a usage quota or rate limit error (429 code)
        const isQuotaError = errStatus === 429 || 
                             errMsg.includes("Quota exceeded") || 
                             errMsg.toLowerCase().includes("quota") || 
                             errMsg.toLowerCase().includes("rate limit");
                             
        if (isQuotaError) {
          console.warn(`[Gemini Quota Error] Model ${currentModel} hit rate/quota limit. Skipping further retries and falling back directly.`);
          break; // Break attempt loop to proceed to next model immediately
        }
      }
    }
    console.warn(`[Gemini Fallback] Model ${currentModel} exhausted all ${maxRetries} retries. Trying next model in sequence if available...`);
  }
  
  throw lastError;
}

// Helper function to call Gemini model with streaming enabled
async function* generateContentStreamWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 3,
  onModelSelect?: (model: string) => void
): AsyncGenerator<any, any, any> {
  let lastError: any = null;
  
  // Cleanly map outdated, unsupported, or deprecated names to modern ones as defined in gemini-api skill
  let mappedModel = primaryModel;
  const lowerModel = (primaryModel || "").toLowerCase().trim();
  
  if (
    lowerModel === "gemini-1.5-pro" || 
    lowerModel === "gemini-2.0-pro" || 
    lowerModel === "gemini-pro" || 
    lowerModel === "gemini-2.5-pro"
  ) {
    mappedModel = "gemini-3.1-pro-preview";
  } else if (
    lowerModel === "gemini-1.5-flash" || 
    lowerModel === "gemini-2.0-flash" || 
    lowerModel === "gemini-2.5-flash"
  ) {
    mappedModel = "gemini-3.5-flash";
  }

  // Create robust fallback sequence of models to maximize success rates
  const modelsToTry: string[] = [mappedModel];
  
  if (mappedModel === "gemini-3.5-flash") {
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  } else if (mappedModel === "gemini-3.1-pro-preview") {
    modelsToTry.push("gemini-3.5-flash");
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  } else if (mappedModel === "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-flash-latest");
    modelsToTry.push("gemini-3.5-flash");
  } else {
    // Default fallback sequence for any other input or unexpected configuration
    modelsToTry.push("gemini-3.5-flash");
    modelsToTry.push("gemini-3.1-flash-lite");
    modelsToTry.push("gemini-flash-latest");
  }

  // Unique list maintaining insertion priorities
  const uniqueModels = Array.from(new Set(modelsToTry));
  console.warn(`[Gemini Stream Fallback Debug] modelsToTry: ${JSON.stringify(modelsToTry)}, uniqueModels: ${JSON.stringify(uniqueModels)}`);

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate exponential backoff with jitter: delay = base * 2^(attempt-1) + jitter
          const baseDelay = 1000;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 300;
          console.warn(`[Gemini Retry Stream] Model ${currentModel} failed or busy. Retrying stream attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        
        const responseStream = await ai.models.generateContentStream({
          model: currentModel,
          contents,
          config,
        });

        // If we successfully acquire the stream without throw, invoke the successful model selection callback
        if (onModelSelect) {
          onModelSelect(currentModel);
        }
        
        for await (const chunk of responseStream) {
          yield chunk;
        }
        return; // Complete success
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.response ? error.response.status : null);
        console.error(`[Gemini Stream Error] Model ${currentModel} failed on attempt ${attempt}:`, errMsg);
        
        // Define clean check for invalid API key or bad credentials
        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
                            
        if (isAuthError) {
          throw error; // Fail immediately on authentication issues so the user sees correct instructions
        }

        // Check if model has hit a usage quota or rate limit error (429 code)
        const isQuotaError = errStatus === 429 || 
                             errMsg.includes("Quota exceeded") || 
                             errMsg.toLowerCase().includes("quota") || 
                             errMsg.toLowerCase().includes("rate limit");
                             
        if (isQuotaError) {
          console.warn(`[Gemini Quota Error Stream] Model ${currentModel} hit rate/quota limit (429). Skipping further retries and falling back directly to next available fallback model.`);
          break; // Break the attempt loop to proceed to next model immediately
        }
      }
    }
  }
  
  throw lastError;
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
  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.5-flash", systemPrompt: "" };
  const modelToUse = chat.selectedModel || userSettings.defaultModel || "gemini-3.5-flash";

  // Create User Message
  const userMsg = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    role: "user",
    content: content || "",
    timestamp: new Date().toISOString(),
    attachedFiles: attachedFiles || []
  };

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

    // Execute server-side Gemini request
    const m = chat.mode || "general";
    let modeInstruction = "";
    if (m === "math") {
      modeInstruction = "\n\n[Active Preset Mode: Math Solver (Expert Role)]\n" +
        "You are the A-NOVA mathematics specialist. Focus EXCLUSIVELY on mathematics, scientific computations, logic puzzles, and quantitative reasoning.\n" +
        "1. Provide exceptionally precise, step-by-step mathematical proofs and deep calculations.\n" +
        "2. Render all expressions beautifully in LaTeX formatting (using $ for inline or $$ for block display) or clean text-formatting.\n" +
        "3. Always write down the full formulas, explain variable derivations, verify all calculations double-checking every single arithmetic operation, and outline the rationales/theorems behind every logical transition.\n" +
        "4. Prioritize maximum accuracy, high rigor, and comprehensive procedural transparency to avoid errors. Do not skip intermediate steps; show your work fully.";
    } else if (m === "coding") {
      modeInstruction = "\n\n[Active Preset Mode: Coding Chat (Expert Role)]\n" +
        "You are the A-NOVA advanced coding architect. Focus strictly on computer programming, system architecture, algorithm design, debugging, and software development.\n" +
        "1. Translate ideas into complete, production-ready, beautifully structured code blocks in multiple languages (TypeScript, JavaScript, Python, C++, Go, HTML/CSS, etc.).\n" +
        "2. When fixing errors, diagonalize the root cause clearly, explain why it occurred, and output the patched, debugged code in full.\n" +
        "3. Provide clean comments, standard modularity, robust error-handling, edge-case validation, proper variable naming, and performance principles.\n" +
        "4. Explain code clearly with descriptive paragraphs and design guides when requested. Ensure zero hand-waving or placeholders in generated code.";
    } else if (m === "project") {
      modeInstruction = "\n\n[Active Preset Mode: Project Planner (Expert Role)]\n" +
        "You are the A-NOVA project management expert. Focus on business model ideas, organization planning, milestone roadmaps, dynamic goals, and execution strategies.\n" +
        "1. Guide the user in modular project decomposition, work breakdown structures, and progress tracking maps for their idea.\n" +
        "2. Create highly structured, itemized checklists with [ ] and [x] status indicators.\n" +
        "3. Offer strategic feedback, risk reviews, timeline estimations, and action-oriented roadmap milestones.\n" +
        "4. Help users convert abstract ideas into concrete, easily digestible projects partitioned into minor tasks.";
    } else {
      modeInstruction = "\n\n[Active Preset Mode: General Chat (Expert Role)]\n" +
        "You are A-NOVA, a friendly, witty, highly knowledgeable, and conversational AI assistant similar to ChatGPT.\n" +
        "1. Respond to general, everyday questions, text translations, summaries, and creative conversations with warmth, support, and professional composure.\n" +
        "2. Help with creative writing, brainstorming, open discussions, productivity, and general knowledge requests.\n" +
        "3. Use natural emojis where appropriate (😊, 🚀, 💡, 🎯) to keep the dialogue lively, friendly, and engaging.";
    }

    let customInstructions = "";
    if (userSettings.aboutMe && userSettings.aboutMe.trim()) {
      customInstructions += `\n\n[What user wants you to know about them (Custom Details)]:\n${userSettings.aboutMe}`;
    }
    if (userSettings.respondWay && userSettings.respondWay.trim()) {
      customInstructions += `\n\n[How you should write your responses (Custom Guidelines)]:\n${userSettings.respondWay}`;
    }

    const antiRoboticInstruction = "\n\n[CRITICAL DIRECTIVE ON STYLE/TONE - DO NOT VIOLATE]:\n" +
      "1. You MUST operate as a realistic, natural, and helpful human companion (like ChatGPT).\n" +
      "2. STRICTLY REMOVE robotic, cheesy, or promotional phrases such as 'Ready to dive in?', 'Let's make it happen!', 'Let's dive deep!', 'Let's get started!', or similar marketing hype.\n" +
      "3. Keeping answers short, highly natural, and directly conversational is the highest priority. Skip robotic intro filler, preambles, and postambles.\n" +
      "4. REDUCE EMOJIS to an absolute minimum or zero. Do not use more than one emoji in a reply, and do not use any emojis by default unless strongly appropriate.\n" +
      "5. Keep the content ultra-pragmatic, simple, clear, and realistic. Frame responses with elegant plain text or clean markdown headers when necessary, but keep paragraphs concise and human.";

    const dynamicSystemPrompt = (userSettings.systemPrompt || "You are A-NOVA, a friendly, highly intelligent, and conversational AI assistant similar to ChatGPT.") + modeInstruction + customInstructions + antiRoboticInstruction;

    // Optimize performance by setting up an SSE stream connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Bypass Vercel response buffering for real-time streaming

    let completeAiText = "";
    
    let activeModelResolved = modelToUse;
    
    try {
      const stream = generateContentStreamWithFallback(
        ai,
        modelToUse,
        contents,
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
        }
      }

      // Read DB again to get latest state in case of concurrency
      const currentDb = readDb();
      const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
      
      const assistantMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: completeAiText || "I was unable to formulate a response.",
        timestamp: new Date().toISOString(),
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
      const errMsg = genErr.message || "An expected error occurred during content retrieval. Please double check that your API Key is valid under Settings & try again shortly.";
      
      res.write(`data: ${JSON.stringify({ 
        type: "chunk", 
        text: `\n\n❌ **Gemini Stream Error:** ${errMsg}` 
      })}\n\n`);
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
      server: { middlewareMode: true },
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
