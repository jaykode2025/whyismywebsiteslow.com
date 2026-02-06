<script>
  import Button from "./ui/Button.svelte";

  let { insights = [] } = $props();

  const safeInsights = $derived(Array.isArray(insights) ? insights : []);

  const severities = ["critical", "high", "medium", "low"];

  const categories = $derived(
    Array.from(new Set(safeInsights.map((i) => i?.category).filter(Boolean)))
  );

  let activeSeverities = $state(new Set(severities));
  let activeCategories = $state(new Set());

  // Keep activeCategories synced when categories change
  $effect(() => {
    // If nothing selected yet, default to all categories
    if (activeCategories.size === 0) {
      activeCategories = new Set(categories);
      return;
    }

    // Remove categories that no longer exist
    const next = new Set([...activeCategories].filter((c) => categories.includes(c)));
    // Add newly appearing categories (optional behavior)
    for (const c of categories) next.add(c);

    activeCategories = next;
  });

  function toggleSeverity(level) {
    const next = new Set(activeSeverities);
    next.has(level) ? next.delete(level) : next.add(level);
    activeSeverities = next;
  }

  function toggleCategory(cat) {
    const next = new Set(activeCategories);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    activeCategories = next;
  }

  const filtered = $derived(
    safeInsights.filter((item) => {
      const sev = item?.severity;
      const cat = item?.category;
      return activeSeverities.has(sev) && activeCategories.has(cat);
    })
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
    <span class="text-slate-400">Severity</span>
    {#each severities as severity}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${
          activeSeverities.has(severity)
            ? "border-sky-400/50 bg-sky-400/10 text-sky-100"
            : "border-white/10 text-slate-400"
        }`}
        on:click={() => toggleSeverity(severity)}
      >
        {severity}
      </Button>
    {/each}
  </div>

  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
    <span class="text-slate-400">Category</span>
    {#each categories as category}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${
          activeCategories.has(category)
            ? "border-emerald-300/50 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 text-slate-400"
        }`}
        on:click={() => toggleCategory(category)}
      >
        {String(category).replace(/-/g, " ")}
      </Button>
    {/each}
  </div>

  <div class="grid gap-4">
    {#if filtered.length === 0}
      <p class="text-sm text-slate-400">No insights match those filters.</p>
    {:else}
      {#each filtered as insight}
        <div class="glass rounded-2xl p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg text-slate-100">{insight.title}</h3>
            <div class="flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
              <span class="rounded-full bg-white/10 px-3 py-1 text-slate-300">{insight.category}</span>
              <span class="rounded-full bg-rose-400/15 px-3 py-1 text-rose-200">{insight.severity}</span>
            </div>
          </div>

          <p class="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
            Impact: {insight.impact} · Effort: {insight.effort}
          </p>

          <p class="mt-3 text-sm text-slate-300">{insight.whatItMeans}</p>

          <div class="mt-3 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Why it hurts</p>
              <p>{insight.whyItHurts}</p>
            </div>

            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">How to fix</p>
              <ul class="list-disc pl-5">
                {#each (Array.isArray(insight.howToFix) ? insight.howToFix : []) as step}
                  <li>{step}</li>
                {/each}
              </ul>
            </div>

            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Verify</p>
              <ul class="list-disc pl-5">
                {#each (Array.isArray(insight.verification) ? insight.verification : []) as step}
                  <li>{step}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
