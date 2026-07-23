export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 encoding or local server url
  text?: string; // Extracted text content for document/code files
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachedFiles?: AttachedFile[];
  isSpeechPlaying?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  selectedModel: string;
  systemPrompt?: string;
  mode?: 'general' | 'math' | 'coding' | 'project';
  pinned?: boolean;
  archived?: boolean;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  planStatus?: string; // "Free Tier", "Plus", "Enterprise"
  role?: string; // e.g. "admin", "user"
  provider?: string; // e.g. "Supabase Auth" | "A-NOVA Direct"
}

export interface Settings {
  defaultModel: string;
  systemPrompt: string;
  aboutMe: string; // ChatGPT Custom Instructions: What to know about user
  respondWay: string; // ChatGPT Custom Instructions: How to dynamically respond
  voiceEnabled: boolean;
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir' | string;
  isDarkMode: boolean;

  // 1. General
  language?: string;
  region?: string;
  timezone?: string;
  keyboardShortcutsEnabled?: boolean;

  // 2. Appearance
  theme?: 'system' | 'dark' | 'light';
  chatWidth?: 'standard' | 'full';
  fontSize?: 'sm' | 'md' | 'lg';
  messageDensity?: 'comfortable' | 'compact' | 'spacious';
  accentColor?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' | 'blue';
  enableAnimations?: boolean;

  // 3. Chat
  memoryEnabled?: boolean;
  customInstructionsEnabled?: boolean;
  autoScroll?: boolean;
  codeFormatting?: boolean;
  markdownEnabled?: boolean;
  enterToSend?: boolean;
  responseStreaming?: boolean;

  // 4. Voice
  speechSpeed?: number;
  micSettingsEnabled?: boolean;
  voiceLanguage?: string;

  // 5. Data Controls
  archivedChatIds?: string[];
  historyDisabled?: boolean;

  // 6. Security
  twoFactorEnabled?: boolean;

  // 7. Notifications
  emailNotifications?: boolean;
  productUpdates?: boolean;
  featureAnnouncements?: boolean;
  securityAlerts?: boolean;
  soundEffectsEnabled?: boolean;
  browserNotificationsEnabled?: boolean;

  // 8. Connected Apps / API Keys
  customApiKey?: string;
}
