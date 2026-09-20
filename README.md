# RagDocs frontend

This is a small React + TypeScript frontend for the RagDocs backend.

## Run it

The backend should be running at `http://localhost:8000`.

```bash
npm.cmd install
npm.cmd run dev
```

To use another API URL, create a `.env` file:

```text
VITE_API_URL=http://localhost:8000
```

## How the code is organized

- `src/api.ts` contains the Axios client and backend request functions.
- `src/auth.tsx` contains authentication state and the JWT session.
- `src/App.tsx` contains the screens and small UI components.
- TanStack Query loads and caches workspaces, knowledge bases, and documents.

The normal flow is:

1. `AuthScreen` logs in and stores the access token.
2. `WorkspaceList` loads or creates workspaces.
3. `Documents` loads knowledge bases and documents for the selected workspace.
4. Selecting a document polls its detail endpoint while it is processing.
5. `AgentPanel` sends questions for the selected workspace and document.

All document and agent requests include the selected workspace ID.
