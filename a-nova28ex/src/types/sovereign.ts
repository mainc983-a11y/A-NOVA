export type SovereignProvider = 'ollama' | 'vllm' | 'lmstudio' | 'local_endpoint' | 'custom';

export type SovereignUserRole = 'admin' | 'user' | 'viewer';

export interface SovereignModel {
  id: string;
  name: string;
  family?: string;
  size?: string;
  quantization?: string;
  contextWindow?: number;
  capabilities: ('general' | 'reasoning' | 'coding' | 'vision' | 'tools')[];
  recommendedFor: string;
  isDefault?: boolean;
}

export interface SovereignConfig {
  provider: SovereignProvider;
  endpointUrl: string;
  apiKey?: string;
  selectedModel: string;
  autoRoutingEnabled: boolean;
  agentModeEnabled: boolean;
  activeWorkspaceId: string;
  userRole: SovereignUserRole;
  toolPermissions: Record<string, boolean>;
  sandboxConfig: {
    timeoutMs: number;
    memoryLimitMb: number;
    allowNetwork: boolean;
    allowFs: boolean;
    strictMode: boolean;
  };
  isConnected: boolean;
  lastCheckedAt?: string;
  detectedModels: SovereignModel[];
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  heading?: string;
  tokenCount?: number;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'csv' | 'txt' | 'json' | 'image' | 'markdown' | string;
  size: number;
  uploadedAt: string;
  workspaceId: string;
  pageCount?: number;
  chunks: KnowledgeChunk[];
  summary?: string;
  tokens?: number;
  confidentialityLevel?: 'Secret' | 'Confidential' | 'Internal';
}

export interface DocumentCitation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  heading?: string;
  chunkText: string;
  similarity: number;
}

export type TaskStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentTaskStep {
  id: string;
  title: string;
  description?: string;
  status: TaskStepStatus;
  toolUsed?: string;
  durationMs?: number;
  outputSummary?: string;
}

export interface AgentExecutionPlan {
  planId: string;
  taskPrompt: string;
  routedModel: string;
  routingReason?: string;
  steps: AgentTaskStep[];
  citations: DocumentCitation[];
  sandboxRuns?: Array<{
    id: string;
    code: string;
    language: string;
    output: string;
    status: 'success' | 'error';
    durationMs: number;
  }>;
  totalDurationMs: number;
  isComplete: boolean;
}

export interface SovereignWorkspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  memberRole: SovereignUserRole;
  securityLevel: 'Air-Gapped' | 'Confidential' | 'Restricted';
  documentCount?: number;
  sessionCount?: number;
}

export type AuditCategory = 'auth' | 'upload' | 'model' | 'agent' | 'tool' | 'sandbox' | 'security' | 'workspace';
export type AuditSeverity = 'info' | 'notice' | 'warning' | 'security';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  workspaceId: string;
  workspaceName: string;
  actor: string;
  role: SovereignUserRole;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  details: Record<string, any>;
  status: 'success' | 'denied' | 'error';
}

export interface SovereignTool {
  id: string;
  name: string;
  description: string;
  category: 'document' | 'analysis' | 'code' | 'security' | 'synthesis';
  icon: string;
  defaultEnabled: boolean;
  requiredRole: SovereignUserRole;
  parametersSchema?: Record<string, any>;
}
