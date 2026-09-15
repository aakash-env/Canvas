import type {
  CanvasData,
  CanvasElement,
  ArtboardDimensions,
  AuthResult,
  User,
} from "@/types/canvas";

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

interface ApiResponse<T> {
  data: T;
}

interface ApiError {
  error: { message: string; statusCode: number };
}

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      message = body.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

export const api = {
  // Auth API
  register: (payload: { email: string; password: string; name: string }): Promise<AuthResult> =>
    request<AuthResult>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }): Promise<AuthResult> =>
    request<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: (): Promise<User> => request<User>("/api/auth/me"),

  // Canvas API
  listCanvases: (): Promise<CanvasData[]> =>
    request<CanvasData[]>("/api/canvases"),

  getCanvas: (id: string): Promise<CanvasData> =>
    request<CanvasData>(`/api/canvases/${id}`),

  createCanvas: (payload: {
    name: string;
    artboard?: ArtboardDimensions;
    elements?: CanvasElement[];
  }): Promise<CanvasData> =>
    request<CanvasData>("/api/canvases", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCanvas: (
    id: string,
    payload: {
      name?: string;
      artboard?: ArtboardDimensions;
      elements?: CanvasElement[];
    }
  ): Promise<CanvasData> =>
    request<CanvasData>(`/api/canvases/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteCanvas: (id: string): Promise<void> =>
    request<void>(`/api/canvases/${id}`, { method: "DELETE" }),
};