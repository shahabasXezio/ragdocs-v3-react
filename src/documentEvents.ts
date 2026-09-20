export type DocumentStatusEvent = {
  type: "document.status";
  docid: string;
  workspace_id: number;
  status: string;
  progress?: number | null;
  error?: string | null;
};

function websocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return apiUrl.replace(/^http/, "ws").replace(/\/$/, "");
}

export const documentEvents = {
  subscribe(workspaceId: number, docid: string, onEvent: (event: DocumentStatusEvent) => void, onOpen: () => void, onError: () => void) {
    const token = localStorage.getItem("access_token");
    if (!token) return () => undefined;
    const socket = new WebSocket(`${websocketBaseUrl()}/api/v1/workspaces/${workspaceId}/documents/${encodeURIComponent(docid)}/events?token=${encodeURIComponent(token)}`);
    socket.onopen = onOpen;
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as DocumentStatusEvent;
        if (event.type === "document.status" && event.docid === docid) onEvent(event);
      } catch {
        // Ignore malformed events; the status endpoint remains authoritative.
      }
    };
    socket.onerror = onError;
    return () => socket.close();
  },
};
