<script>
  let { insights = [] } = $props();
  const severities = ["critical", "high", "medium", "low"];
  let activeSeverities = $state(new Set(severities));
  let activeCategories = $state(new Set(insights.map((i) => i.category)));

  const categories = Array.from(new Set(insights.map((i) => i.category)));

  function toggleSeverity(level) {
    if (activeSeverities.has(level)) {
      activeSeverities.delete(level);
    } else {
      activeSeverities.add(level);
    }
    activeSeverities = new Set(activeSeverities);
  }

  function toggleCategory(level) {
    if (activeCategories.has(level)) {
      activeCategories.delete(level);
    } else {
      activeCategories.add(level);
    }
    activeCategories = new Set(activeCategories);
  }

  $derived filtered = insights.filter(
    (item) => activeSeverities.has(item.severity) && activeCategories.has(item.category)
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
    <span class="text-slate-400">Severity</span>
    {#each severities as severity}
      <button
        class={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${
          activeSeverities.has(severity)
            ? "border-sky-400/50 bg-sky-400/10 text-sky-100"
            : "border-white/10 text-slate-400"
        }`}
        type="button"
        on:click={() => toggleSeverity(severity)}
      >
        {severity}
      </button>
    {/each}
  </div>

  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
    <span class="text-slate-400">Category</span>
    {#each categories as category}
      <button
        class={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${
          activeCategories.has(category)
            ? "border-emerald-300/50 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 text-slate-400"
        }`}
        type="button"
        on:click={() => toggleCategory(category)}
      >
        {category.replace(/-/g, " ")}
      </button>
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
          <p class="mt-3 text-sm text-slate-300">{insight.whatItMeans}</p>
          <div class="mt-3 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Why it hurts</p>
              <p>{insight.whyItHurts}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">How to fix</p>
              <ul class="list-disc pl-5">
                {#each insight.howToFix as step}
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
