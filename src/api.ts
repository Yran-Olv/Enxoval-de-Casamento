const API_BASE = (import.meta.env.VITE_API_URL || "").trim();
const API_URL = API_BASE ? `${API_BASE.replace(/\/+$/, "")}/api` : "/api";

const fetchOpts = { credentials: "include" as const };

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data.error === "string" && data.error.trim()) return data.error;
      if (data && typeof data.message === "string" && data.message.trim()) return data.message;
      return JSON.stringify(data);
    }
    const text = await res.text();
    if (!text) return `Erro HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
      if (parsed && typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
    } catch {
      // response is plain text
    }
    return text;
  } catch {
    return `Erro HTTP ${res.status}`;
  }
}

async function parseResponse(res: Response) {
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, fetchOpts);
    return parseResponse(res);
  },

  /** Exportação de backup: devolve JSON e, se o servidor gravou cópia, o caminho relativo (ex.: backups/…json). */
  getBackupExport: async (): Promise<{ backup: unknown; savedPath: string | null; filename: string | null }> => {
    const res = await fetch(`${API_URL}/backup/export`, fetchOpts);
    if (!res.ok) throw new Error(await readErrorMessage(res));
    const savedPath = res.headers.get("X-Backup-Saved-Path");
    const filename = res.headers.get("X-Backup-Filename");
    const backup = await res.json();
    return {
      backup,
      savedPath: savedPath?.trim() || null,
      filename: filename?.trim() || null,
    };
  },
  post: async (path: string, data: any) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      ...fetchOpts,
    });
    return parseResponse(res);
  },
  put: async (path: string, data: any) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      ...fetchOpts,
    });
    return parseResponse(res);
  },
  delete: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      ...fetchOpts,
    });
    return parseResponse(res);
  }
};
