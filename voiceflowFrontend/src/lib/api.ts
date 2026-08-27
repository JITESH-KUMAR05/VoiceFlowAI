/**
 * Every call to the backend goes through this module.
 *
 * Ten components previously called fetch("http://localhost:8000/...")
 * directly, which meant the app only worked on the machine that built it and
 * that no caller had a real error path — a failed request rendered as a
 * silently empty table.
 *
 * The base URL comes from VITE_API_BASE_URL. See .env.example.
 */

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** A request that reached the server and came back as a failure. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The server could not be reached at all. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new NetworkError(
      `Could not reach the API at ${BASE_URL}. Is the backend running?`,
    );
  }

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

/** Prefer FastAPI's error detail over a bare status code. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    // Validation errors arrive as a list of per-field objects.
    if (Array.isArray(detail) && detail[0]?.msg) {
      return detail.map((item) => item.msg).join("; ");
    }
  } catch {
    // Not JSON. Fall through to the status text.
  }
  return response.statusText || `Request failed (${response.status})`;
}

// --- Types matching the backend schemas -------------------------------------

export interface StartCallRequest {
  lead_name: string;
  agent_type: string;
  /** Omit to run the same pipeline in the browser instead of dialling. */
  phone_number?: string;
  lead_email?: string;
  lead_company?: string;
  language?: string;
  voice_id?: string;
  /**
   * Anything the enquiry form already captured — budget, location, property
   * type. The backend folds these into the system prompt so the agent does
   * not open by asking for what the caller has already given.
   */
  details?: Record<string, string | number | boolean>;
}

export interface StartCallResponse {
  status: "call_initiated" | "browser_session_started";
  call_sid: string;
  greeting: string;
  greeting_audio_url: string | null;
  language: string;
}

export interface ChatResponse {
  text: string;
  audio_url: string;
}

/** A lead as returned by the Salesforce sync. */
export interface CrmLead {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  score: number;
  sentiment: string;
  last_contact: string;
  summary: string;
  transcript: string;
  company_type: string;
  lifestyle: string;
  pain_points: string;
  verdict: string;
}

export interface HealthResponse {
  status: string;
  providers: { twilio: boolean; salesforce: boolean; email: boolean };
  active_sessions: number;
}

// --- Endpoints --------------------------------------------------------------

export const api = {
  health: () => request<HealthResponse>("/health"),

  startCall: (body: StartCallRequest) =>
    request<StartCallResponse>("/api/phone/call", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  sendMessage: (sessionId: string, message: string) =>
    request<ChatResponse>("/api/browser/chat", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, message }),
    }),

  endCall: (sessionId: string) =>
    request<{ status: string }>("/api/browser/end", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, message: "end" }),
    }),

  leads: (agentType: string = "all") =>
    request<CrmLead[]>(
      `/api/crm/leads?agent_type=${encodeURIComponent(agentType)}`,
    ),
};

/** Turn any thrown value into something worth showing a person. */
export function describeError(error: unknown): string {
  if (error instanceof NetworkError || error instanceof ApiError) {
    return error.message;
  }
  return "Something went wrong. Try again.";
}
