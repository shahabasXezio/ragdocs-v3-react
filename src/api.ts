import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

export type User = { id: number; email: string; display_name: string };
export type AuthResponse = { user: User; access_token: string; refresh_token: string; token_type: string };

export const authService = {
  login: async (email: string, password: string) => (await api.post<AuthResponse>("/api/v1/auth/login", { email, password })).data,
  register: async (email: string, password: string, display_name: string) => (await api.post<AuthResponse>("/api/v1/auth/register", { email, password, display_name })).data,
  refresh: async (refresh_token: string) => (await api.post<{ access_token: string; refresh_token: string; token_type: string }>("/api/v1/auth/refresh", { refresh_token })).data,
  logout: async (refresh_token: string) => { await api.post("/api/v1/auth/logout", { refresh_token }); },
  me: async () => (await api.get<User>("/api/v1/auth/me")).data,
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
  const authRoute = typeof config?.url === "string" && ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh", "/api/v1/auth/logout"].some((route) => config.url?.includes(route));
  if (error.response?.status !== 401 || !config || config._retry || authRoute) {
    if (error.response?.status === 401 && !authRoute) window.dispatchEvent(new Event("ragdocs:unauthorized"));
    return Promise.reject(error);
  }
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) { window.dispatchEvent(new Event("ragdocs:unauthorized")); return Promise.reject(error); }
  try {
    const refreshed = await authService.refresh(refreshToken);
    localStorage.setItem("access_token", refreshed.access_token);
    localStorage.setItem("refresh_token", refreshed.refresh_token);
    config._retry = true;
    config.headers.Authorization = `Bearer ${refreshed.access_token}`;
    return api(config);
  } catch (refreshError) {
    window.dispatchEvent(new Event("ragdocs:unauthorized"));
    return Promise.reject(refreshError);
  }
});

export type Workspace = { id: number; name: string; owner_id: number };
export type Document = {
  docid: string;
  filename: string;
  status: string;
  knowledge_base_id?: number;
  progress?: number | null;
  error?: string | null;
  job_id?: string;
  quiz_status?: "not_requested" | "queued" | "processing" | "completed" | "failed" | string;
  questions?: Question[];
};
export type KnowledgeBase = { id: number; name: string; workspace_id: number };
export type Question = { id: number; question: string };
export type QuizAnswer = { itemid: number; answer: string };
export type QuizResult = {
  status: string;
  docid: string;
  total_average: number;
  finalres: { itemid: number; score_distance: number; status: string; color: string; ideal_answer: string }[];
};
export type AgentResponse = {
  status: string;
  answer: string;
  evidence?: Evidence[];
  citations?: Citation[];
  strategy?: string;
  candidate_count?: number;
  model?: string;
  verification?: { status: string; output?: string; citations?: unknown[] };
  trace?: { step?: string; source_count?: number; candidate_count?: number; latency_ms?: number }[];
  execution_id?: string;
  latency_ms?: number;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number; llm_calls: number; estimated_cost_usd?: number | null };
};
export type Evidence = { source_id?: string; chunk_id: number; document_id: string; filename?: string; page_number?: number | null; text?: string; distance?: number; score?: number; retrieval_score?: number; rerank_score?: number; rank: number };
export type Citation = Omit<Evidence, "text">;
export type AgentTool = { name: string; description: string };
export type AnalyticsSummary = { query_count: number; successful_queries: number; failed_queries: number; success_rate: number | null; median_latency_ms: number | null; p95_latency_ms: number | null; input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number | null; llm_calls: number };
export type WorkspaceInsights = {
  documents_saved: number;
  documents_ready: number;
  documents_processing: number;
  documents_failed: number;
  searches_asked: number;
  successful_searches: number;
  quizzes_created: number;
  labels: Record<string, string>;
  message: string;
};

export const workspaceService = {
  list: async () => (await api.get<{ workspaces: Workspace[] }>("/api/v1/workspaces")).data.workspaces,
  create: async (name: string) => (await api.post<Workspace>("/api/v1/workspaces", { name })).data,
};

export const knowledgeBaseService = {
  list: async (workspaceId: number) => {
    const response = await api.get<KnowledgeBase[] | { knowledge_bases: KnowledgeBase[] }>(`/api/v1/workspaces/${workspaceId}/knowledge-bases`);
    return Array.isArray(response.data) ? response.data : response.data.knowledge_bases;
  },
  create: async (workspaceId: number, name: string) => (await api.post<KnowledgeBase>(`/api/v1/workspaces/${workspaceId}/knowledge-bases`, { name })).data,
};

export const documentService = {
  list: async (workspaceId: number, knowledgeBaseId?: number) =>
    (await api.get<{ documents: Document[] }>(`/api/v1/workspaces/${workspaceId}/documents`, { params: knowledgeBaseId ? { knowledge_base_id: knowledgeBaseId } : undefined })).data.documents,
  detail: async (workspaceId: number, docid: string) => (await api.get<Document & { questions?: Question[] }>(`/api/v1/workspaces/${workspaceId}/documents/${docid}`)).data,
  upload: async (workspaceId: number, file: File, knowledgeBaseId?: number, onUploadProgress?: (progress: number) => void) => { const form = new FormData(); form.append("file", file); if (knowledgeBaseId) form.append("knowledge_base_id", String(knowledgeBaseId)); return (await api.post<Document>(`/api/v1/workspaces/${workspaceId}/documents`, form, { onUploadProgress: event => { if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100)); } })).data; },
  remove: async (workspaceId: number, docid: string) => { await api.delete(`/api/v1/workspaces/${workspaceId}/documents/${docid}`); },
  requestQuiz: async (workspaceId: number, docid: string) =>
    (await api.post<{ docid: string; quiz_status: string; job_id?: string }>(`/api/v1/workspaces/${workspaceId}/documents/${docid}/quiz`)).data,
  grade: async (workspaceId: number, docid: string, answers: QuizAnswer[]) =>
    (await api.post<QuizResult>(`/api/v1/workspaces/${workspaceId}/documents/${docid}/answers`, { answers })).data,
};

export const agentService = {
  tools: async () => (await api.get<{ tools: AgentTool[] }>("/api/v1/agent/tools")).data.tools,
  query: async (workspaceId: number, query: string, options: { docid?: string; docids?: string[]; knowledge_base_id?: number; strategy?: "smart" | "dense" | "lexical" | "hybrid" } = {}) => (await api.post<AgentResponse>("/api/v1/agent/query", { workspace_id: workspaceId, query, strategy: "smart", ...options })).data,
};

export const analyticsService = {
  insights: async (workspaceId: number) => (await api.get<WorkspaceInsights>(`/api/v1/workspaces/${workspaceId}/insights`)).data,
  summary: async (workspaceId: number) => (await api.get<AnalyticsSummary>(`/api/v1/workspaces/${workspaceId}/analytics/summary`)).data,
  queries: async (workspaceId: number) => (await api.get<{ queries: { execution_id: string; query: string; status: string; model?: string; strategy?: string; latency_ms?: number; created_at?: string }[] }>(`/api/v1/workspaces/${workspaceId}/analytics/queries?limit=50`)).data.queries,
};
