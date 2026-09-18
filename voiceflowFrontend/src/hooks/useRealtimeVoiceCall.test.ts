import { describe, expect, it } from "vitest";

import { alignPcmChunk, floatTo16BitPCM } from "./useRealtimeVoiceCall";

describe("floatTo16BitPCM", () => {
  it("scales full-range samples to the 16-bit signed range", () => {
    const pcm = floatTo16BitPCM(new Float32Array([1, -1, 0]));
    expect(Array.from(pcm)).toEqual([32767, -32768, 0]);
  });

  it("clamps out-of-range input instead of wrapping", () => {
    const pcm = floatTo16BitPCM(new Float32Array([2, -2]));
    expect(Array.from(pcm)).toEqual([32767, -32768]);
  });
});

describe("alignPcmChunk", () => {
  it("passes an already-even chunk straight through with no carry", () => {
    const chunk = new Uint8Array([1, 0, 2, 0, 3, 0]).buffer;
    const { samples, carry } = alignPcmChunk(chunk, null);
    expect(Array.from(samples)).toEqual([1, 2, 3]);
    expect(carry).toBeNull();
  });

  it("holds back a trailing odd byte instead of throwing", () => {
    // 5 bytes: two whole samples plus one dangling byte.
    const chunk = new Uint8Array([1, 0, 2, 0, 9]).buffer;
    const { samples, carry } = alignPcmChunk(chunk, null);
    expect(Array.from(samples)).toEqual([1, 2]);
    expect(carry).toEqual(new Uint8Array([9]));
  });

  it("prepends a pending byte from the previous chunk to reassemble the split sample", () => {
    const pending = new Uint8Array([9]); // low byte of the next sample
    const chunk = new Uint8Array([0, 4, 0]).buffer; // high byte, then one more whole sample
    const { samples, carry } = alignPcmChunk(chunk, pending);
    // little-endian: [9, 0] -> 9, then [4, 0] -> 4
    expect(Array.from(samples)).toEqual([9, 4]);
    expect(carry).toBeNull();
  });

  it("matches what a real Int16Array(chunk) would have thrown on directly", () => {
    // Reproduces the exact failure observed against a live backend during
    // Task 12 manual verification: an odd-length WS binary frame crashed
    // `new Int16Array(chunk)` with "byte length ... should be a multiple of
    // 2". alignPcmChunk must never throw on this input.
    const oddChunk = new Uint8Array(1441).buffer;
    expect(() => alignPcmChunk(oddChunk, null)).not.toThrow();
  });
});
