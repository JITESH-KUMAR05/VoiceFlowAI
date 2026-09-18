import { describe, expect, it } from "vitest";

import { toWebSocketUrl } from "./realtimeCall";

describe("toWebSocketUrl", () => {
  it("turns http into ws", () => {
    expect(toWebSocketUrl("http://127.0.0.1:8000")).toBe(
      "ws://127.0.0.1:8000",
    );
  });

  it("turns https into wss", () => {
    expect(toWebSocketUrl("https://api.example.com")).toBe(
      "wss://api.example.com",
    );
  });
});
