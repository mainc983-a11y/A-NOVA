export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 encoding or local server url
  text?: string; // Extracted text content for document/code files
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  provider?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachedFiles?: AttachedFile[];
  isSpeechPlaying?: boolean;
  generatedImages?: GeneratedImage[];
  hasSpeech?: boolean;
  autoPlayVoice?: boolean;
  speechAudioUrl?: string;
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
  userId?: string;
  email: string;
  phone?: string;
  countryCode?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  planStatus?: string; // "Free Tier", "Plus", "Enterprise"
  role?: string; // e.g. "admin", "user"
  provider?: string; // e.g. "Supabase Auth" | "A-NOVA Direct"

  // Extended Profile details
  bio?: string;
  website?: string;
  company?: string;
  occupation?: string;
  privacyVisibility?: 'public' | 'private';
  profileDiscoverable?: boolean;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
}

export interface Settings {
  defaultModel: string;
  systemPrompt: string;
  aboutMe: string; // ChatGPT Custom Instructions: What to know about user
  respondWay: string; // ChatGPT Custom Instructions: How to dynamically respond
  voiceEnabled: boolean;
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir' | string;
  isDarkMode: boolean;

  // 1. General & Preferences
  language?: string;
  region?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  keyboardShortcutsEnabled?: boolean;

  // 2. Appearance
  theme?: 'system' | 'dark' | 'light';
  chatWidth?: 'standard' | 'full' | 'comfortable' | 'wide';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  fontStyle?: 'default' | 'modern' | 'classic' | 'rounded';
  messageDensity?: 'comfortable' | 'compact' | 'spacious';
  accentColor?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' | 'blue' | 'indigo' | 'zinc' | 'auto';
  showChatMetadata?: boolean;
  enableAnimations?: boolean;
  reduceMotion?: boolean;
  smoothTransitions?: boolean;
  typingAnimations?: boolean;
  messageAnimations?: boolean;

  // Sidebar appearance options
  showSidebarByDefault?: boolean;
  collapseSidebarAuto?: boolean;
  alwaysExpandedDesktop?: boolean;
  rememberSidebarState?: boolean;

  // Chat bubbles & background
  chatBubbleStyle?: 'rounded' | 'compact' | 'modern_cards' | 'minimal';
  backgroundType?: 'default' | 'gradient' | 'solid' | 'wallpaper' | 'blur';
  backgroundOpacity?: number;
  customWallpaperUrl?: string;

  // Code blocks
  codeTheme?: 'dark' | 'light' | 'auto';
  codeShowLineNumbers?: boolean;
  codeWrapLines?: boolean;
  codeCopyButton?: boolean;

  // Accessibility
  highContrastMode?: boolean;
  largeTouchTargets?: boolean;
  improvedFocusIndicators?: boolean;
  keyboardNavSupport?: boolean;

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
