<script>
  let { id } = $props();
  let status = $state("queued");
  let error = $state("");
  let reportUrl = $state("");
  let timer = $state(null);
  const previewUrl = $derived(id ? `/report/${id}` : "");

  async function poll() {
    if (!id) return;
    try {
      const res = await fetch(`/api/report/${id}`);
      const data = await res.json();
      status = data.status;
      if (data.status === "done") {
        reportUrl = `/report/${id}`;
      }
      if (data.status === "failed") {
        error = data.error ?? "Scan failed";
      }
    } catch (err) {
      error = "Unable to fetch scan status";
    }
  }

  $effect(() => {
    if (!id) return;
    poll();
    timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    if (status === "done" || status === "failed") {
      if (timer) clearInterval(timer);
    }
  });

  const progress = $derived(
    status === "queued" ? 25 : status === "running" ? 65 : status === "done" ? 100 : 35
  );
</script>

<div class="space-y-2">
  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div
      class="h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 transition-all duration-700"
      style={`width: ${progress}%`}
    ></div>
  </div>
  <p class="text-sm text-slate-200">
    {#if status === "queued"}Scan queued. Warming up engines...
    {:else if status === "running"}Scanning now. Building your report...
    {:else if status === "done"}Report ready.
    {:else}Scan status: {status}
    {/if}
  </p>
  {#if status === "done"}
    <div class="space-y-3">
      <div class="rounded-xl border border-white/10 bg-white/5 p-3">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated impact if fixed</p>
        <ul class="mt-2 space-y-1 text-xs text-slate-300">
          <li>+12–28% higher conversion rate (mobile)</li>
          <li>−0.8s LCP → lower bounce</li>
          <li>Potential uplift: $320–$1,900/month</li>
        </ul>
        <p class="mt-2 text-[11px] text-slate-500">Modeled from industry benchmarks; ranges vary by site.</p>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">What this unlocks</p>
        <ul class="mt-2 space-y-1 text-xs text-slate-300">
          <li>Exact fixes, not generic advice</li>
          <li>Priority order (what to fix first)</li>
          <li>Dev-ready steps and benchmarks</li>
          <li>Before/after checklist to verify wins</li>
        </ul>
      </div>
      <form method="post" action="/api/billing/report-checkout">
        <input type="hidden" name="reportId" value={id} />
        <button
          class="w-full rounded-xl bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5"
          type="submit"
        >
          Unlock Full Report — $19
        </button>
      </form>
      <form method="post" action="/api/leads/preview" class="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="reportId" value={id} />
        <input type="hidden" name="next" value={previewUrl} />
        <input type="text" name="company" class="hidden" tabindex="-1" autocomplete="off" />
        <input
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
          type="email"
          name="email"
          placeholder="Email me the preview"
          required
        />
        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
          type="submit"
        >
          Send preview
        </button>
      </form>
      <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>One-time payment • Instant access • No account required</span>
        <span>No spam. You can unsubscribe anytime.</span>
      </div>
    </div>
  {/if}
  {#if error}
    <p class="text-sm text-rose-300">{error}</p>
  {/if}
</div>
