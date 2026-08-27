import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError, describeError, NetworkError } from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api requests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: "ok", providers: {}, active_sessions: 0 }),
    );

    const result = await api.health();

    expect(result.status).toBe("ok");
  });

  it("throws NetworkError when the request cannot be sent at all", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.health()).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws ApiError with the response status on a non-2xx reply", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ detail: "not found" }, 404),
    );

    const error = (await api.leads("b2b").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("not found");
  });

  it("joins a FastAPI validation error list into one message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          detail: [
            { msg: "field required" },
            { msg: "value is not a valid phone number" },
          ],
        },
        422,
      ),
    );

    const error = (await api
      .startCall({ lead_name: "", agent_type: "b2b" })
      .catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe(
      "field required; value is not a valid phone number",
    );
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>gateway timeout</html>", {
        status: 504,
        statusText: "Gateway Timeout",
      }),
    );

    const error = (await api.health().catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe("Gateway Timeout");
  });

  it("encodes the agent type in the leads query string", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]));

    await api.leads("real estate & co");

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain(
      `agent_type=${encodeURIComponent("real estate & co")}`,
    );
  });

  it("posts the session id and message when sending a chat turn", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ text: "hi", audio_url: "http://x/audio" }),
    );

    await api.sendMessage("sess-1", "hello");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({ session_id: "sess-1", message: "hello" });
  });
});

describe("describeError", () => {
  it("passes through an ApiError's message", () => {
    expect(describeError(new ApiError(404, "Session not found"))).toBe(
      "Session not found",
    );
  });

  it("passes through a NetworkError's message", () => {
    expect(describeError(new NetworkError("offline"))).toBe("offline");
  });

  it("gives an unrecognised error a safe generic message", () => {
    expect(describeError(new TypeError("boom"))).toBe(
      "Something went wrong. Try again.",
    );
  });

  it("handles a thrown non-Error value without crashing", () => {
    expect(describeError("a plain string")).toBe(
      "Something went wrong. Try again.",
    );
  });
});
