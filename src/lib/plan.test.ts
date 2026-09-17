import { describe, expect, it } from "vitest";
import {
  getEffectivePlan,
  getPlanLimits,
  isPaidStatus,
  isPro,
  type PlanInfo,
} from "./plan";

const info = (plan: PlanInfo["plan"], status: string): PlanInfo => ({
  plan,
  status,
  currentPeriodEnd: null,
});

describe("isPaidStatus", () => {
  it("treats active and trialing as paid", () => {
    expect(isPaidStatus("active")).toBe(true);
    expect(isPaidStatus("trialing")).toBe(true);
  });

  it("keeps past_due paid as a grace period", () => {
    expect(isPaidStatus("past_due")).toBe(true);
  });

  it("rejects terminal and unknown statuses", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "inactive", "", null, undefined]) {
      expect(isPaidStatus(status as any)).toBe(false);
    }
  });
});

describe("getEffectivePlan", () => {
  it("keeps the paid plan while the subscription is live", () => {
    expect(getEffectivePlan(info("pro", "active"))).toBe("pro");
    expect(getEffectivePlan(info("agency", "trialing"))).toBe("agency");
  });

  // Regression: the stored row keeps `plan: "pro"` after cancellation because
  // Stripe only moves `status`. Deriving entitlements from `plan` alone let
  // canceled customers keep paid access indefinitely.
  it("falls back to free once the subscription is no longer paid", () => {
    expect(getEffectivePlan(info("pro", "canceled"))).toBe("free");
    expect(getEffectivePlan(info("agency", "canceled"))).toBe("free");
    expect(getEffectivePlan(info("pro", "unpaid"))).toBe("free");
    expect(getEffectivePlan(info("pro", "incomplete_expired"))).toBe("free");
  });
});

describe("isPro", () => {
  it("is true for live paid plans", () => {
    expect(isPro(info("pro", "active"))).toBe(true);
    expect(isPro(info("agency", "active"))).toBe(true);
    expect(isPro(info("pro", "past_due"))).toBe(true);
  });

  it("is false for free and for lapsed paid plans", () => {
    expect(isPro(info("free", "inactive"))).toBe(false);
    expect(isPro(info("pro", "canceled"))).toBe(false);
    expect(isPro(info("agency", "unpaid"))).toBe(false);
  });

  // A canceled customer showing as "pro" also had the upgrade button hidden on
  // /billing, so they could not resubscribe without contacting support.
  it("lets a canceled customer be offered an upgrade again", () => {
    expect(isPro(info("pro", "canceled"))).toBe(false);
  });
});

describe("getPlanLimits", () => {
  it("scales limits by plan", () => {
    expect(getPlanLimits("free")).toEqual({ maxProjects: 1, monthlyScanLimit: 15 });
    expect(getPlanLimits("pro")).toEqual({ maxProjects: 20, monthlyScanLimit: 250 });
    expect(getPlanLimits("agency")).toEqual({ maxProjects: 200, monthlyScanLimit: 2000 });
  });

  it("gives a lapsed pro subscriber free-tier limits", () => {
    expect(getPlanLimits(getEffectivePlan(info("pro", "canceled")))).toEqual(
      getPlanLimits("free")
    );
  });
});
