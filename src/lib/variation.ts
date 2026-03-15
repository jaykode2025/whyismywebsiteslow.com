export type VariationTone = "technical" | "direct" | "friendly";
export type VariationVisualMode = "charts-heavy" | "tables-heavy" | "mixed";
export type VariationCtaVariant = "scan" | "pricing" | "email";
export type VariationProofType = "chart" | "table" | "calculator" | "case";

export type VariationTokens = {
  tone: VariationTone;
  sectionOrder: string[];
  visualMode: VariationVisualMode;
  ctaVariant: VariationCtaVariant;
  proofType: VariationProofType;
};

type TokenOptions = {
  slug: string;
  availableSections: string[];
  override?: Partial<VariationTokens>;
};

const TONES: VariationTone[] = ["technical", "direct", "friendly"];
const VISUAL_MODES: VariationVisualMode[] = ["charts-heavy", "tables-heavy", "mixed"];
const CTA_VARIANTS: VariationCtaVariant[] = ["scan", "pricing", "email"];
const PROOF_TYPES: VariationProofType[] = ["chart", "table", "calculator", "case"];

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
};

const pickDeterministic = <T>(pool: T[], seed: string, suffix: string): T => {
  const hash = hashString(`${seed}:${suffix}`);
  return pool[hash % pool.length];
};

const orderedSections = (slug: string, sections: string[]) => {
  return [...sections].sort((a, b) => {
    const aScore = hashString(`${slug}:${a}`);
    const bScore = hashString(`${slug}:${b}`);
    return aScore - bScore;
  });
};

export const deriveVariationTokens = ({
  slug,
  availableSections,
  override,
}: TokenOptions): VariationTokens => {
  const base: VariationTokens = {
    tone: pickDeterministic(TONES, slug, "tone"),
    sectionOrder: orderedSections(slug, availableSections),
    visualMode: pickDeterministic(VISUAL_MODES, slug, "visual"),
    ctaVariant: pickDeterministic(CTA_VARIANTS, slug, "cta"),
    proofType: pickDeterministic(PROOF_TYPES, slug, "proof"),
  };

  const mergedOrder = override?.sectionOrder
    ? [...override.sectionOrder, ...base.sectionOrder.filter((id) => !override.sectionOrder?.includes(id))]
    : base.sectionOrder;

  return {
    ...base,
    ...override,
    sectionOrder: mergedOrder,
  };
};

export const sectionOrderMap = (orderedIds: string[]) => {
  return orderedIds.reduce<Record<string, number>>((acc, id, index) => {
    acc[id] = index + 1;
    return acc;
  }, {});
};

export const shouldRenderOptionalSection = (tokens: VariationTokens, sectionId: string) => {
  if (sectionId === "social-proof") return tokens.visualMode !== "tables-heavy";
  if (sectionId === "resources") return tokens.tone !== "direct";
  if (sectionId === "faq") return tokens.tone !== "technical" || tokens.visualMode === "mixed";
  return true;
};
