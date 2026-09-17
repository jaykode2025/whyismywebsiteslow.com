import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "free" | "pro" | "agency";
export type PaidStatus = "active" | "trialing" | "past_due";

export type PlanLimits = {
  maxProjects: number;
  monthlyScanLimit: number;
};

export type PlanInfo = {
  plan: Plan;
  status: string;
  currentPeriodEnd?: string | null;
};

export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<PlanInfo> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { plan: "free", status: "inactive", currentPeriodEnd: null };
  return {
    plan: (data.plan as Plan) || "free",
    status: data.status ?? "inactive",
    currentPeriodEnd: (data.current_period_end as any) ?? null,
  };
}

/**
 * A stored row keeps `plan` at whatever price the customer last bought, even
 * after the subscription ends - Stripe's `customer.subscription.deleted` only
 * moves `status` to "canceled". Entitlements must therefore be derived from
 * plan AND status, never from plan alone.
 */
export function getEffectivePlan(info: PlanInfo): Plan {
  return isPaidStatus(info.status) ? info.plan : "free";
}

export function isPro(plan: PlanInfo) {
  const effective = getEffectivePlan(plan);
  return effective === "pro" || effective === "agency";
}

export function getPlanLimits(plan: Plan): PlanLimits {
  if (plan === "agency") {
    return { maxProjects: 200, monthlyScanLimit: 2000 };
  }
  if (plan === "pro") {
    return { maxProjects: 20, monthlyScanLimit: 250 };
  }
  return { maxProjects: 1, monthlyScanLimit: 15 };
}

export function isPaidStatus(status: string | null | undefined): status is PaidStatus {
  return status === "active" || status === "trialing" || status === "past_due";
}
