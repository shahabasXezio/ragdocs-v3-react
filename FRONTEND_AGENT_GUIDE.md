# Frontend Agent Guide

This is a React integration guide for the CV/demo document knowledge platform.
It is intentionally simple: users create a workspace, create knowledge bases,
upload PDFs, wait for indexing, and ask grounded questions across the selected
scope.

The product story is:

```text
workspace -> knowledge base -> PDF -> page-aware chunks -> query -> answer + sources + runtime statistics
```

Do not put Gemini, Hugging Face, database, JWT secret, Redis, Celery, or MCP
credentials in the browser.

## Frontend conventions

Use React + TypeScript, Axios, and TanStack Query. Keep Axios calls inside
typed API functions/hooks; components should consume hooks rather than call
Axios directly. Clear protected TanStack Query caches after logout or when the
authenticated user changes.

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});
```

Attach `Authorization: Bearer <access_token>` to protected requests. Refresh
once on an expired access token; if refresh fails, clear auth and redirect to
login. Always show loading, empty, processing, failed, unauthorized, and
no-evidence states.

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Register/login body:

```json
{
  "email": "user@example.com",
  "password": "at-least-8-characters",
  "display_name": "User Name"
}
```

Successful register/login response:

```json
{
  "user": { "id": 1, "email": "user@example.com", "display_name": "User Name" },
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer"
}
```

Refresh body is `{ "refresh_token": "..." }`. Replace both tokens with the
returned values. Logout returns `204 No Content`.

## Workspaces and knowledge bases

```text
GET  /api/v1/workspaces
POST /api/v1/workspaces                 { "name": "Security Knowledge" }
GET  /api/v1/workspaces/{workspaceId}/knowledge-bases
POST /api/v1/workspaces/{workspaceId}/knowledge-bases
                                        { "name": "Policies" }
```

The active `workspaceId` must be selected before showing documents or running
queries. A knowledge base belongs to exactly one workspace. Preserve the
selected workspace and optional knowledge base in route/UI state.

## Documents

```text
POST   /api/v1/workspaces/{workspaceId}/documents
GET    /api/v1/workspaces/{workspaceId}/documents?knowledge_base_id=7
GET    /api/v1/workspaces/{workspaceId}/documents/{docid}
DELETE /api/v1/workspaces/{workspaceId}/documents/{docid}
```

Upload as multipart form data. Do not manually set the multipart content type:

```ts
const form = new FormData();
form.append("file", file);
form.append("knowledge_base_id", String(knowledgeBaseId));
await api.post(`/api/v1/workspaces/${workspaceId}/documents`, form);
```

Upload returns `{ docid, workspace_id, status: "queued", quiz_status, job_id }`.
Document list items contain `docid`, `filename`, `status`,
`quiz_status`, and `knowledge_base_id`. Statuses are normally `queued`,
`processing`, `completed`, or `failed`. Only enable querying after
`completed`; show the returned error for `failed`.

For live progress, use:

```text
WS  /api/v1/workspaces/{workspaceId}/documents/{docid}/events?token=<access_token>
```

This is a WebSocket. Stop after `completed` or `failed`; use short bounded
polling as a fallback. Quiz generation is optional and must never start
automatically after upload.

Document details also return `error` for failed indexing and may return a
`questions` array. The optional explicit quiz request is:

```text
POST /api/v1/workspaces/{workspaceId}/documents/{docid}/quiz
```

It returns `202` with `{ docid, quiz_status: "queued", job_id }`. Only expose
this behind an explicit user action. Quiz grading is intentionally retired in
this lightweight backend: the legacy endpoint remains registered but returns
`410 Gone`, so the frontend must not build a grading flow around:

```text
POST /api/v1/workspaces/{workspaceId}/documents/{docid}/answers
```

## Grounded query

Primary route:

```text
POST /api/v1/agent/query
```

Request examples:

```json
{ "workspace_id": 1, "query": "Summarize the security requirements.", "strategy": "smart" }
```

`strategy` is optional and defaults to `smart`. Supported values are `smart`,
`dense`, `lexical`, and `hybrid`. Smart search chooses an appropriate method
automatically and may apply bounded second-stage reranking. The UI should keep
Smart search as the default; advanced mode selection is optional.

```json
{ "workspace_id": 1, "knowledge_base_id": 7, "query": "What is the renewal period?" }
```

```json
{ "workspace_id": 1, "docid": "document-id", "query": "What are the password rules?" }
```

The optional `docids` list supports a selected set of documents. Never silently
change the requested scope. The backend rejects workspace/knowledge-base
mismatches.

Successful response shape:

```json
{
  "status": "success",
  "answer": "...",
  "strategy": "hybrid_retrieval",
  "model": "...",
  "evidence": [
    {
      "chunk_id": 12,
      "source_id": "document-id:12",
      "document_id": "document-id",
      "filename": "security-policy.pdf",
      "page_number": 4,
      "text": "Exact supporting excerpt...",
      "distance": 0.31,
      "score": 0.763359,
      "rank": 1,
      "retrieval_score": 0.031,
      "rerank_score": 0.28
    }
  ],
  "citations": [
    { "source_id": "document-id:12", "chunk_id": 12, "document_id": "document-id", "filename": "security-policy.pdf", "page_number": 4, "rank": 1, "score": 0.763359, "distance": 0.31, "retrieval_score": 0.031, "rerank_score": 0.28 }
  ],
  "verification": { "status": "not_run", "reason": "Simple demo agent" },
  "trace": [
    { "step": "retrieve", "source_count": 1, "candidate_count": 18, "latency_ms": 42.1 },
    { "step": "generate" }
  ],
  "usage": { "input_tokens": 100, "output_tokens": 40, "total_tokens": 140, "llm_calls": 1 },
  "latency_ms": 1200.5,
  "candidate_count": 18,
  "execution_id": "..."
}
```

Render the answer first, then expandable source cards showing filename,
document ID, page number, chunk ID, rank, score/distance, and the exact text.
Use `source_id` as the React key. Do not use array position as the key. If
search details are shown, display the strategy, candidate count, and latency
as secondary information; do not expose internal implementation jargon unless
the user opens the details section.
The `evidence` array is the canonical rich source list; `citations` is a
compact duplicate for integrations. If it is empty, show:

```text
No supporting evidence was found in the selected document scope.
```

Do not call an HTTP 200 answer “verified”; the demo explicitly returns
`verification.status: "not_run"`.

The older document-only query route remains available:

```text
POST /api/v1/workspaces/{workspaceId}/documents/{docid}/queries
body: { "query": "..." }
```

Prefer `/api/v1/agent/query` because it returns scope, sources, trace, and
usage data. The quiz grading endpoint is retired in this lightweight version;
do not build a grading flow around it.

For a developer-only tool list, use:

```text
GET /api/v1/agent/tools
```

It returns the same tool descriptions as `/api/v1/mcp/tools`.

## Dashboard and research statistics

Normal dashboard:

```text
GET /api/v1/workspaces/{workspaceId}/insights
```

It returns document counts and query counts, including:
`documents_saved`, `documents_ready`, `documents_processing`,
`documents_failed`, `searches_asked`, `successful_searches`, and
`quizzes_created`.

Owner/admin research panel:

```text
GET /api/v1/workspaces/{workspaceId}/analytics/summary
GET /api/v1/workspaces/{workspaceId}/analytics/queries?limit=50
```

The summary is observed runtime data, not a benchmark accuracy score. It
contains:

```json
{
  "query_count": 10,
  "successful_queries": 9,
  "failed_queries": 1,
  "success_rate": 0.9,
  "average_latency_ms": 850.2,
  "median_latency_ms": 790.0,
  "p95_latency_ms": 1400.0,
  "average_retrieval_latency_ms": 120.4,
  "average_sources_per_query": 3.2,
  "abstention_count": 1,
  "strategy_counts": { "dense_retrieval": 10 },
  "verification_status_counts": { "not_run": 10 },
  "input_tokens": 1000,
  "output_tokens": 400,
  "total_tokens": 1400,
  "llm_calls": 10,
  "estimated_cost_usd": null
}
```

`estimated_cost_usd` may be `null` when backend pricing variables are not
configured. Never fabricate it. The queries response includes execution ID,
query text, status, strategy, model, latency, source count, retrieval latency,
verification status, token counts, cost, error, and timestamp.

Suggested research cards: query count, success rate, average/P95 latency,
average sources per query, abstentions, strategy distribution, verification
status distribution, and token usage. Include this note:

> Statistics are observed runtime measurements from this workspace. They are not benchmark accuracy results.

## MCP

MCP is a backend capability. The browser should use `/api/v1/agent/query` for
normal product queries and must not contain MCP secrets.

Authenticated discovery routes:

```text
GET  /api/v1/mcp/tools
POST /api/v1/mcp/call
POST /api/v1/mcp                 JSON-RPC MCP transport
```

The JSON-RPC endpoint supports `initialize`, `notifications/initialized`,
`tools/list`, and `tools/call`. `tools/call` arguments must include the
active `workspace_id`; the backend checks membership before executing the tool.
The current tools are `search_documents` and `summarize_document`.

Do not implement MCP in React. A developer-only tool inspector may display
`GET /api/v1/mcp/tools` if the product explicitly enables it.

## TanStack Query keys and invalidation

```ts
const queryKeys = {
  me: ["auth", "me"],
  workspaces: ["workspaces"],
  knowledgeBases: (workspaceId: number) => ["knowledge-bases", workspaceId],
  documents: (workspaceId: number, kb?: number) => ["documents", workspaceId, kb],
  document: (workspaceId: number, docid: string) => ["document", workspaceId, docid],
  insights: (workspaceId: number) => ["insights", workspaceId],
  analyticsSummary: (workspaceId: number) => ["analytics-summary", workspaceId],
  analyticsQueries: (workspaceId: number, limit: number) => ["analytics-queries", workspaceId, limit],
};
```

After upload, invalidate documents and insights. After indexing, invalidate
documents, document details, and insights. After deletion, invalidate those
queries and clear the selected document. After logout/user change, clear all
workspace, document, answer, and analytics caches.

## Suggested screens and acceptance checklist

Build in this order: auth; workspace/KB selection; upload and processing;
document list/details; scoped query; answer/source cards; dashboard counts;
owner/admin research panel; optional developer tool list.

The frontend is ready when a user can log in, create/select a workspace and KB,
upload a PDF, see indexing state, query a document/KB/workspace, inspect exact
page-aware evidence, understand no-evidence and authorization failures, see
runtime statistics without fabricated metrics, clear protected state on logout,
and confirm `GET /health` succeeds.
