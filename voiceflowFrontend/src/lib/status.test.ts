import { describe, expect, it } from "vitest";

import { badgeFor, scoreColor, scoreLabel } from "./status";

describe("scoreColor", () => {
  it("bands 70 and above as high", () => {
    expect(scoreColor(70)).toBe("text-score-high");
    expect(scoreColor(100)).toBe("text-score-high");
  });

  it("bands 40 to 69 as mid", () => {
    expect(scoreColor(40)).toBe("text-score-mid");
    expect(scoreColor(69)).toBe("text-score-mid");
  });

  it("bands below 40 as low", () => {
    expect(scoreColor(39)).toBe("text-score-low");
    expect(scoreColor(0)).toBe("text-score-low");
  });

  it("matches the backend's thresholds exactly at the boundary", () => {
    // salesforce_service.sentiment_for_score uses >= 70 and >= 40. A score
    // one point below a threshold must land in the lower band on both sides.
    expect(scoreColor(69)).not.toBe(scoreColor(70));
    expect(scoreColor(39)).not.toBe(scoreColor(40));
  });
});

describe("scoreLabel", () => {
  it("labels each band to match the backend's picklist values", () => {
    expect(scoreLabel(85)).toBe("Interested");
    expect(scoreLabel(50)).toBe("Neutral");
    expect(scoreLabel(10)).toBe("Not interested");
  });
});

describe("badgeFor", () => {
  const map = { qualified: "qualified-classes" };

  it("returns the mapped class for a known key", () => {
    expect(badgeFor(map, "qualified")).toBe("qualified-classes");
  });

  it("falls back to a neutral badge for an unknown key", () => {
    expect(badgeFor(map, "something-new")).toContain("bg-muted");
  });

  it("falls back to a neutral badge when the key is undefined", () => {
    expect(badgeFor(map, undefined)).toContain("bg-muted");
  });
});
