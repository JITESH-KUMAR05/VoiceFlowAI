import { describe, expect, it } from "vitest";

import type { CrmLead } from "@/lib/api";

import { summarise } from "./useLeads";

function lead(overrides: Partial<CrmLead> = {}): CrmLead {
  return {
    id: "1",
    name: "Asha",
    email: null,
    company: null,
    status: "Open",
    score: 50,
    sentiment: "Neutral",
    last_contact: "2026-01-01T00:00:00Z",
    summary: "",
    transcript: "",
    company_type: "",
    lifestyle: "",
    pain_points: "",
    verdict: "",
    ...overrides,
  };
}

describe("summarise", () => {
  it("returns all-zero, null stats for no leads", () => {
    expect(summarise([])).toEqual({
      total: 0,
      interested: 0,
      neutral: 0,
      notInterested: 0,
      averageScore: null,
      lastContact: null,
    });
  });

  it("bands scores at the same thresholds the backend uses", () => {
    const stats = summarise([
      lead({ id: "1", score: 70 }), // interested boundary
      lead({ id: "2", score: 69 }), // neutral boundary
      lead({ id: "3", score: 40 }), // neutral boundary
      lead({ id: "4", score: 39 }), // not-interested boundary
    ]);

    expect(stats.interested).toBe(1);
    expect(stats.neutral).toBe(2);
    expect(stats.notInterested).toBe(1);
  });

  it("rounds the average score to the nearest whole number", () => {
    const stats = summarise([
      lead({ id: "1", score: 70 }),
      lead({ id: "2", score: 71 }),
      lead({ id: "3", score: 71 }),
    ]);

    // (70 + 71 + 71) / 3 = 70.666...
    expect(stats.averageScore).toBe(71);
  });

  it("reports the most recent contact date", () => {
    const stats = summarise([
      lead({ id: "1", last_contact: "2026-01-15T10:00:00Z" }),
      lead({ id: "2", last_contact: "2026-03-01T09:00:00Z" }),
      lead({ id: "3", last_contact: "2026-02-10T09:00:00Z" }),
    ]);

    expect(stats.lastContact).toBe("2026-03-01T09:00:00Z");
  });

  it("ignores leads with no contact timestamp rather than crashing", () => {
    const stats = summarise([
      lead({ id: "1", last_contact: "" }),
      lead({ id: "2", last_contact: "2026-01-01T00:00:00Z" }),
    ]);

    expect(stats.lastContact).toBe("2026-01-01T00:00:00Z");
  });

  it("counts total leads independently of their score", () => {
    const stats = summarise([lead({ id: "1" }), lead({ id: "2" })]);

    expect(stats.total).toBe(2);
  });
});
