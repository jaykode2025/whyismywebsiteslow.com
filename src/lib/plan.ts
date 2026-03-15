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

export function isPro(plan: PlanInfo) {
  return plan.plan === "pro" || plan.plan === "agency";
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
