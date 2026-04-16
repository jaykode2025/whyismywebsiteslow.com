import { describe, expect, it } from "vitest";
import { clampLinks, getHost, normalizeUrl } from "./validate";

describe("normalizeUrl", () => {
  it("adds https when the user pastes a bare domain", () => {
    expect(normalizeUrl("example.com/pricing").toString()).toBe("https://example.com/pricing");
  });

  it("trims whitespace and removes the fragment", () => {
    expect(normalizeUrl("  https://www.example.com/about#team  ").toString()).toBe("https://www.example.com/about");
  });

  it("rejects blank input", () => {
    expect(() => normalizeUrl("   ")).toThrow("URL required");
  });

  it("rejects malformed input", () => {
    expect(() => normalizeUrl("not a url ???")).toThrow("Invalid URL");
  });

  it("blocks obvious internal hosts", () => {
    expect(() => normalizeUrl("http://localhost:3000")).toThrow("Internal URLs not allowed");
    expect(() => normalizeUrl("http://192.168.1.10")).toThrow("Internal URLs not allowed");
    expect(() => normalizeUrl("http://172.16.0.8")).toThrow("Internal URLs not allowed");
  });
});

describe("getHost", () => {
  it("removes a leading www prefix", () => {
    expect(getHost(new URL("https://www.example.com"))).toBe("example.com");
  });
});

describe("clampLinks", () => {
  it("clamps crawl depth into the supported range", () => {
    expect(clampLinks(undefined)).toBe(0);
    expect(clampLinks(0)).toBe(0);
    expect(clampLinks(2.9)).toBe(2);
    expect(clampLinks(9)).toBe(5);
  });
});
