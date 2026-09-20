# Project Overview — Adaptive Agentic Knowledge Intelligence Platform

## 1. Project Overview

**This project** is being evolved from an existing RAG-based document processing and quiz-generation application into an **adaptive agentic knowledge intelligence platform**.

The existing V2 implementation provides the baseline:

- FastAPI backend
- PostgreSQL + pgvector
- Hugging Face embeddings (`all-MiniLM-L6-v2`)
- Gemini LLM
- LangChain text splitting
- PDF ingestion
- Semantic document retrieval
- Document question answering
- Quiz generation
- Embedding-based semantic answer grading
- Docker-based deployment

The goal of the next version is **not** to build another generic "chat with your PDF" application.

The goal is to turn retrieval into one capability inside an **AI agent that can reason about a user's request, select and combine appropriate strategies, use tools, verify evidence, and produce useful grounded outputs**.

---

## 2. Core Research Question

> **How can an agentic knowledge system dynamically choose, combine, and evaluate retrieval, reasoning, and tool-use strategies to solve complex knowledge-intensive tasks reliably and efficiently?**

The system should therefore be built around measurable experiments rather than simply accumulating AI features.

---

## 3. Research Hypothesis

> **Allowing the agent to select its own retrieval, reasoning, and tool-use strategy—rather than prescribing a fixed pipeline—may improve performance on complex knowledge tasks, with measurable trade-offs in quality, latency, cost, and reliability. The actual architecture and strategy should emerge from experimentation rather than being assumed in advance.**

This hypothesis should be tested experimentally.

The project must report both improvements and trade-offs.

---

## 4. Product Direction

The system should evolve from:

```text
Upload PDF
    ↓
Generate Quiz / Answer Questions
```

into:

```text
User
  ↓
Workspace
  ↓
Knowledge Base
  ↓
Documents
  ↓
AI Agent
  ├── Search
  ├── Retrieve
  ├── Compare
  ├── Summarize
  ├── Extract
  ├── Detect Conflicts
  ├── Generate Reports
  ├── Generate Assessments
  └── Verify Evidence
```

The quiz functionality should remain as one available capability/tool, not the identity of the platform.

The product should support **knowledge-work over document collections**, rather than only document-level conversation.

---

## 5. Architecture Direction

The following is a **starting recommendation, not a mandatory implementation**. The final architecture should be chosen by the implementation agent/developer after inspecting the existing codebase, validating assumptions, and experimenting with alternatives.

```text
                         ┌───────────────────┐
                         │    React Client   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    FastAPI API    │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ LangGraph Agent   │
                         │ / State Machine   │
                         └─────────┬─────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
         Dense Retrieval     Hybrid Retrieval    Graph Retrieval
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   ▼
                              Reranker
                                   │
                                   ▼
                         Evidence Sufficiency
                           /              \
                        Enough?          Missing
                           │                │
                           ▼                ▼
                     Answer/Analyze     Query Rewrite
                                           │
                                           └──────► Retrieve Again
                                   │
                                   ▼
                           Claim Verification
                                   │
                                   ▼
                              Grounded Output
                                   │
                                   ▼
                               Citations
```

The exact implementation may evolve as experiments reveal better design choices.

---

## 6. Agent Architecture

The project should use an explicit agent/orchestration layer. **LangGraph is a recommended option**, but the implementation agent should decide whether LangGraph, another orchestration approach, or a carefully designed custom state machine is most appropriate after evaluating the problem and implementation complexity.

One possible flow is shown below as an **example only**. The agent should not be constrained to this exact graph:

```text
START
  ↓
Understand / Classify Query
  ↓
Select Retrieval Strategy
  ├── Simple semantic query → Dense Retrieval
  ├── Keyword / exact-term query → Lexical Retrieval
  ├── Mixed query → Hybrid Retrieval
  ├── Multi-hop/entity query → Graph Retrieval
  └── Ambiguous query → Query Reformulation
  ↓
Retrieve Candidates
  ↓
Rerank Evidence
  ↓
Evaluate Evidence Sufficiency
  ├── Sufficient → Generate Response
  └── Insufficient → Reformulate / Retrieve Again
  ↓
Verify Important Claims
  ↓
Return Grounded Response + Sources
  ↓
END
```

The agent should **not be hard-coded into a single retrieval path or tool sequence**. It should be given capabilities, constraints, observability, and evaluation criteria, then allowed to determine the most appropriate strategy. A major research objective is to discover which strategies emerge as useful in practice and under what conditions.

---

## 7. RAG as a Tool

The existing RAG pipeline should be refactored into callable tools.

Example capabilities:

```python
search_documents()
dense_search()
hybrid_search()
search_graph()
retrieve_evidence()
rerank_evidence()
summarize_document()
compare_documents()
extract_information()
detect_conflicts()
generate_quiz()
verify_claims()
generate_report()
```

The agent decides which capability is appropriate for the task.

This changes the architecture from:

```text
User → RAG → LLM
```

to:

```text
User → Agent → Tools → Evidence → Reasoning → Output
```

---

## 8. MCP Integration

Implement an **MCP server** exposing document intelligence capabilities as standardized tools.

Recommended MCP tools:

```text
search_documents
hybrid_search
search_graph
retrieve_evidence
compare_documents
summarize_document
extract_information
generate_quiz
verify_claims
generate_report
```

The purpose of MCP is architectural interoperability, not simply adding the acronym to the stack.

The agent should be able to interact with these capabilities through a clean tool boundary.

---

## 9. Multi-User Platform

The platform should support authenticated users and isolated workspaces.

Recommended logical model:

```text
User
 └── Workspace
      ├── Knowledge Bases
      │    └── Documents
      ├── Conversations
      ├── Reports
      └── Evaluations
```

Recommended functionality:

- User registration/login
- JWT authentication
- Refresh tokens
- Password hashing
- Workspace ownership
- Document ownership
- Basic role-based access control
- API authorization
- Rate limiting
- Upload limits
- Tenant-aware retrieval

### Important security rule

Authorization must be enforced **before retrieval**.

A user's retrieval operation must never be able to return another user's document chunks.

---

## 10. Knowledge Bases

Replace isolated single-document interactions with document collections.

Example:

```text
Workspace
 └── Security Knowledge Base
      ├── Security Policy.pdf
      ├── Access Control.pdf
      ├── Incident Response.pdf
      ├── Architecture.pdf
      └── Audit Report.pdf
```

The system should support:

- Multiple documents per knowledge base
- Document metadata
- Tags / categories
- Processing status
- Document versions
- Document ownership
- Collection-level retrieval
- Document-level filtering

---

## 11. Document Intelligence Capabilities

The platform should focus on useful structured tasks.

### Question Answering

Grounded answers with source citations.

### Summarization

Document, section and multi-document summaries.

### Comparison

Compare versions or multiple documents and explain semantic differences.

### Information Extraction

Convert unstructured document content into structured data.

Example:

```json
{
  "company": "...",
  "effective_date": "...",
  "termination_period": "...",
  "renewal_terms": "..."
}
```

### Conflict Detection

Detect contradictory statements across documents.

Example:

```text
Policy A:
Maximum leave = 20 days

Policy B:
Maximum leave = 25 days

→ Conflict detected
```

The system can then reason using document date, authority and evidence.

### Report Generation

Generate structured, evidence-backed reports instead of only conversational responses.

### Assessment Generation

Retain quiz/question generation as one of the agent's tools.

---

## 12. Retrieval Research

The project should investigate multiple retrieval and reasoning strategies where they provide measurable value.

Potential candidates include:

- Dense vector retrieval
- Lexical / BM25 retrieval
- Hybrid retrieval
- Transformer-based reranking
- Query reformulation
- Query decomposition
- Multi-step retrieval
- Hierarchical / structure-aware retrieval
- Graph-assisted retrieval
- Metadata-aware retrieval
- Other approaches identified during implementation or literature review

A simple dense-RAG implementation should serve as a baseline where possible.

The implementation should be free to introduce, remove, combine, or replace these components based on experimental evidence.

### Example experimental progression

```text
Baseline
   ↓
Alternative retrieval strategy
   ↓
Improved retrieval / ranking
   ↓
Agentic selection
   ↓
Verification / iterative reasoning
   ↓
Additional strategies if experiments justify them
```

Do not assume that the final system must contain every candidate approach.

The research contribution should come from **why the final system selected its architecture and what the experiments demonstrated**, not from the number of components included.

## 13. Hierarchical / Structured Retrieval

Evaluate whether document structure can improve retrieval.

Potential hierarchy:

```text
Document
 ├── Section
 │    ├── Subsection
 │    │     ├── Paragraph
 │    │     └── Paragraph
 │    └── ...
 └── ...
```

Potential experiment:

> Compare flat chunk retrieval against hierarchical/context-aware retrieval for questions requiring broader context.

---

## 14. Query Types for Evaluation

Build an evaluation dataset containing different query classes:

```text
Factual
Multi-hop
Comparison
Temporal
Ambiguous
Unanswerable
Conflicting
Keyword-heavy
```

Each evaluation example should ideally contain:

```text
question
expected_answer
query_type
relevant_documents
relevant_pages/chunks
expected_evidence
```

The same dataset should be used when comparing system variants.

---

## 15. Evaluation Metrics

### Retrieval

- Recall@K
- Precision@K
- MRR
- Context relevance
- Context precision

### Generation

- Answer accuracy
- Faithfulness / groundedness
- Unsupported claim rate
- Citation correctness

### Agent

- Tool-selection accuracy
- Unnecessary tool-call rate
- Retrieval retry rate
- Task completion rate

### System

- Median latency
- P95 latency
- Retrieval latency
- LLM latency
- Token consumption
- Estimated inference cost
- Tool-call count
- Error rate

The project should report **real measurements**, not predetermined claims.

---

## 16. Evidence Verification

Introduce a post-generation verification stage.

```text
Generated Answer
       ↓
Claim Extraction
       ↓
Evidence Retrieval
       ↓
Supported?
   /        \
 YES        NO
  |          |
  ▼          ▼
Accept     Revise / Retrieve Again / Abstain
```

The purpose is to reduce unsupported claims and improve trustworthiness.

This component should also be evaluated independently.

---

## 17. Conflict Resolution

Support conflicting information across sources.

Example:

```text
Document A:
Policy effective 2024 → 20 days

Document B:
Policy effective 2025 → 25 days
```

The system should:

1. Detect the conflict
2. Identify the source statements
3. Consider metadata such as date/authority
4. Produce an evidence-backed resolution when possible
5. Clearly state uncertainty when resolution is not possible

Measure conflict detection and resolution accuracy.

---

## 18. Conversational Memory

Keep conversation state separate from document retrieval.

Distinguish between:

### Working Memory

Current conversation state.

### Persistent Conversation History

Previous interactions within a workspace.

### Document Knowledge

External evidence retrieved from the knowledge base.

The architecture should avoid treating all three as the same thing.

---

## 19. Async Processing

Document ingestion should be decoupled from API requests.

Recommended architecture:

```text
Upload
  ↓
FastAPI
  ↓
Job Queue
  ↓
Worker
  ├── Extract
  ├── Chunk
  ├── Embed
  └── Index
```

Potential infrastructure:

```text
FastAPI
Redis
Background Workers
PostgreSQL
Object Storage
```

The frontend should be able to display processing status.

---

## 20. Observability

Each agent execution should generate a trace.

Example:

```text
Request
  ↓
Query Classification
  ↓
Selected Strategy: Hybrid
  ↓
Candidate Retrieval
  ↓
Reranking
  ↓
Evidence Score
  ↓
Insufficient Evidence
  ↓
Query Reformulation
  ↓
Second Retrieval
  ↓
Claim Verification
  ↓
Final Response
```

Track:

```text
request_id
user_id
workspace_id
model
retrieval_strategy
tool_calls
retrieval_latency
reranking_latency
LLM_latency
input_tokens
output_tokens
estimated_cost
verification_status
errors
```

---

## 21. Scaling Considerations

The platform should be designed so that the API tier can remain stateless.

Target architecture:

```text
                 Load Balancer
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        API-1       API-2       API-3
          │           │           │
          └───────────┼───────────┘
                      │
                    Redis
                      │
                 PostgreSQL
                      │
               Background Workers
```

Scaling experiments should measure:

- Concurrent requests
- API latency
- Retrieval latency
- Worker throughput
- Queue delay
- Memory consumption
- Error rate
- LLM bottlenecks

Do not claim scalability without measurement.

---

## 22. Recommended Technology Stack (Starting Point)

### Frontend

**React + TypeScript**

React + TypeScript is a recommended frontend direction. The implementation may choose another approach if the existing architecture or experiments justify it.

Suggested supporting libraries:

- React Router
- TanStack Query
- Tailwind CSS
- A component library where useful

Avoid spending disproportionate time on visual polish.

### Backend

**Python 3.12+**

**FastAPI**

Responsibilities:

- Authentication
- REST APIs
- Workspace/document APIs
- Conversation APIs
- Agent execution endpoints
- Evaluation endpoints
- Admin/observability APIs

### Agent Orchestration

**LangGraph**

If LangGraph is selected, use explicit graph/state orchestration for:

- Query classification
- Retrieval strategy selection
- Tool execution
- Iterative retrieval
- Evidence validation
- Final response generation

### LLM

**Gemini API initially**

Gemini is the current baseline and is recommended initially to reduce unnecessary migration work, but the implementation may evaluate other models where that improves the research.

Design the model layer behind an abstraction so other models can be evaluated later.

### Agent / Tool Interface

**MCP**

An MCP server is recommended for exposing selected document and retrieval capabilities. The exact tool boundary should be determined during implementation.

### Embeddings

Baseline:

**Hugging Face `all-MiniLM-L6-v2`**

The project should allow experiments with stronger embedding models later.

Record embedding model changes explicitly because embedding dimension and retrieval quality are system-level concerns.

### Vector Database

**PostgreSQL + pgvector**

PostgreSQL + pgvector is the recommended baseline because the current project already uses it. The architecture may add or replace storage/retrieval components when experiments justify the complexity.

### Lexical Search

Evaluate a lexical retrieval mechanism such as:

- PostgreSQL full-text search
- BM25 implementation
- OpenSearch/Elasticsearch only if the experiment actually justifies the added infrastructure

Start simple.

### Reranking

Use a **transformer-based reranker**.

The exact model should be selected experimentally based on:

- retrieval quality
- latency
- memory requirements
- licensing
- deployment constraints

### Graph Retrieval

For graph-based retrieval, initially consider:

**Neo4j**

or

**PostgreSQL-based graph tables**

Choose the simpler approach first unless graph scale requires a dedicated graph database.

### Database / ORM

**SQLAlchemy**

**Alembic**

Use structured relational tables for:

- users
- workspaces
- documents
- conversations
- permissions
- evaluation runs
- agent traces
- usage data

### Authentication / Security

- JWT access + refresh tokens
- Password hashing with Argon2 or bcrypt
- Role-based access control
- Tenant-aware authorization
- Rate limiting
- Upload validation
- File-size limits
- Secure secret management

### Storage

Current:

**Supabase Storage**

Possible production evolution:

**Amazon S3**

Use object storage for original documents and derived files rather than storing large binaries directly inside PostgreSQL.

### Cache / Queue

**Redis**

Potential uses:

- Response caching where appropriate
- Short-lived state
- Job queues
- Rate limiting
- Background task coordination

Use it only where it provides measurable value.

### Background Workers

Potential choices:

- Celery
- RQ
- Arq
- FastAPI-compatible async worker approach

The initial choice should favor simplicity.

### Deployment

**Docker + Docker Compose**

Target cloud:

**AWS**

Possible components:

- EC2 / ECS
- S3
- CloudFront
- RDS PostgreSQL if moving database management to AWS
- ElastiCache Redis if required
- Application Load Balancer if horizontally scaling

Use the smallest architecture that allows the intended experiments.

### CI/CD

Recommended:

**GitHub Actions**

Pipeline:

```text
Push
 ↓
Tests
 ↓
Lint / Type Check
 ↓
Build Docker Image
 ↓
Deploy
```

---

## 23. Research Engineering Practices

The repository should explicitly document:

### Baselines

What is the simplest working system?

### Hypotheses

What are we trying to improve?

### Controlled Experiments

What changed between experiments?

### Ablation Studies

What happens when one component is removed?

### Failure Analysis

Where and why does the system fail?

### Trade-offs

What quality improvements cost additional latency, memory or inference cost?

### Reproducibility

Record:

- Model versions
- Embedding models
- Retrieval parameters
- Chunking parameters
- Dataset version
- Evaluation configuration

### Limitations

Clearly document known weaknesses.

---

## 24. Suggested Repository Structure

```text
ragdocs/
│
├── frontend/
│   ├── src/
│   └── ...
│
├── backend/
│   ├── api/
│   ├── auth/
│   ├── agents/
│   │   ├── graph.py
│   │   ├── state.py
│   │   └── nodes/
│   ├── retrieval/
│   │   ├── dense.py
│   │   ├── lexical.py
│   │   ├── hybrid.py
│   │   ├── reranker.py
│   │   └── graph.py
│   ├── tools/
│   ├── mcp/
│   ├── documents/
│   ├── memory/
│   ├── models/
│   ├── evaluation/
│   ├── observability/
│   └── ...
│
├── experiments/
│   ├── baseline_dense/
│   ├── hybrid/
│   ├── reranking/
│   ├── adaptive_agent/
│   └── graph_rag/
│
├── evaluation/
│   ├── datasets/
│   ├── scripts/
│   └── results/
│
├── docs/
│   ├── architecture/
│   ├── experiments/
│   └── failure-analysis/
│
├── docker-compose.yml
├── README.md
└── ...
```

The exact structure can be adapted to the existing V2 codebase rather than forcing a full rewrite.

---

## 25. Suggested Development Order

The order below is a recommendation. The implementation agent should adapt it after inspecting the current V2 codebase.

### Phase 1 — Understand and preserve the baseline

Run and document the existing system.

Establish a reproducible baseline before major architectural changes.

### Phase 2 — Refactor for experimentation

Separate concerns such as:

- ingestion
- retrieval
- generation
- tool interfaces
- agent state
- evaluation

The exact module boundaries should follow the existing codebase rather than forcing a rewrite.

### Phase 3 — Define the research protocol

Create:

- research question
- hypotheses
- evaluation dataset
- metrics
- experiment runner
- baseline configuration

### Phase 4 — Build the first agentic version

Introduce an orchestration layer and allow the agent to use the capabilities that make sense.

### Phase 5 — Run retrieval / reasoning experiments

Test candidate strategies and record quality, latency, reliability, and cost.

### Phase 6 — Add production capabilities

Introduce authentication, workspaces, authorization, asynchronous processing, observability, and other platform capabilities according to actual requirements.

### Phase 7 — Evaluate and iterate

Use experiment results and failure analysis to decide what to keep, remove, or redesign.

### Phase 8 — Product interface

Build the React interface around the validated backend and research system.

### Phase 9 — Deployment and scale testing

Deploy, benchmark, observe, and optimize the real system.

## 26. Definition of Success

The project is successful when it can demonstrate all of the following:

1. A working multi-user document intelligence platform.
2. A LangGraph agent capable of conditional tool use.
3. RAG exposed as a tool rather than being the entire application.
4. MCP-based tool interoperability.
5. Multiple retrieval strategies.
6. Adaptive retrieval based on query characteristics.
7. Evidence verification and citations.
8. Measurable evaluation against a controlled benchmark.
9. Quantified quality / latency / cost trade-offs.
10. Documented failures and limitations.
11. Containerized deployment.
12. Production-oriented authentication, authorization and observability.

The project should **not** claim that the final system is universally better than RAG.

The project should demonstrate:

> **what was tested, what improved, what regressed, why it happened, and what the experiments taught us.**

---

## 27. Final Project Positioning

### Working Project Name

**Adaptive Agentic Knowledge Intelligence Platform**

> The final product name should be chosen separately once the scope and identity of the system are clearer.

### One-line description

> **An experimentally evaluated agentic knowledge system that dynamically chooses retrieval, reasoning, and tool-use strategies for reliable, evidence-backed work over complex information sources.**

### What this project demonstrates

**AI / ML**

- Transformers
- Embeddings
- Retrieval
- Reranking
- RAG
- Graph-based reasoning
- LLMs
- Agents
- Tool use
- MCP
- Evaluation

**Software Engineering**

- Python
- FastAPI
- React
- PostgreSQL
- pgvector
- Authentication
- Multi-tenancy
- Async workers
- Redis
- Docker
- AWS
- CI/CD

**Research Engineering**

- Baselines
- Hypothesis-driven experiments
- Ablation studies
- Benchmark design
- Metrics
- Failure analysis
- Reproducibility
- Quality/latency/cost trade-offs

---

## 28. Guiding Principle

Do not prescribe the final architecture before the implementation and experiments begin.

The project should start with:

> **A clear problem, a research question, measurable objectives, and a capable agent with access to useful tools.**

The implementation agent should be free to determine:

- which retrieval strategies are actually useful
- whether graph reasoning is justified
- whether a reranker improves results enough to keep
- how much orchestration should be explicit
- whether additional memory is needed
- which tools belong behind MCP
- which components should be removed
- what architecture best balances quality, reliability, latency, cost, and complexity

Recommendations in this document are **design candidates and examples, not constraints**.

The final system should emerge from:

**problem definition → baseline → experimentation → evidence → architecture decisions → evaluation → iteration**

The web application is the interface.

The **agentic system and the research questions are the subject**.

The evaluation results are the evidence.
