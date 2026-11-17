import { describe, it, expect } from "vitest";
import { campaignFrom, noteVisit, campaignParams } from "../src/utils/attribution.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const at = (s) => new Date(s).getTime();

describe("campaign attribution", () => {
  it("reads utm params and ignores links without a source", () => {
    expect(campaignFrom("?q=roti&utm_source=instagram&utm_medium=story&utm_content=d1"))
      .toEqual({ source: "instagram", medium: "story", content: "d1" });
    expect(campaignFrom("?q=roti&utm_content=d1")).toBeNull();
  });

  it("keeps the first campaign", () => {
    const s = memory();
    noteVisit("?utm_source=instagram&utm_content=d1", s, at("2026-11-23T20:00:00"));
    noteVisit("?utm_source=linkedin", s, at("2026-11-24T20:00:00"));
    expect(campaignParams(s)).toEqual({ first_source: "instagram", first_content: "d1" });
  });

  it("reports a return visit once per new day", () => {
    const s = memory();
    expect(noteVisit("", s, at("2026-11-23T20:00:00")).returnVisit).toBeNull();
    expect(noteVisit("", s, at("2026-11-23T22:00:00")).returnVisit).toBeNull();
    expect(noteVisit("", s, at("2026-11-25T09:00:00")).returnVisit).toEqual({ days_since_first: 2, visit_days: 2 });
    expect(noteVisit("", s, at("2026-11-25T10:00:00")).returnVisit).toBeNull();
  });
});
