<script>
  import Button from "./ui/Button.svelte";

  let { id } = $props();
  let status = $state("queued");
  let error = $state("");
  let timer = $state(null);
  let score = $state(null);
  let host = $state("");
  let locked = $state(null);
  const previewUrl = $derived(id ? `/report/${id}` : "");

  async function poll() {
    if (!id) return;
    try {
      const res = await fetch(`/api/report/${id}`);
      const data = await res.json();
      status = data.status;

      if (data.status === "done") {
        locked = Boolean(data.locked);
        host = data.report?.canonicalHost ?? data.preview?.canonicalHost ?? "";
        score = data.report?.summary?.score100 ?? data.preview?.summary?.score100 ?? null;
      }

      if (data.status === "failed") {
        error = data.error ?? "Scan failed";
      }
    } catch {
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

<div class="space-y-3">
  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div
      class="h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 transition-all duration-700"
      style={`width: ${progress}%`}
    ></div>
  </div>

  <p class="text-sm text-slate-200">
    {#if status === "queued"}Scan queued. Warming up engines...
    {:else if status === "running"}Scanning now. Building your report...
    {:else if status === "done"}Scan complete.
    {:else}Scan status: {status}
    {/if}
  </p>

  {#if status === "done"}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Next step</p>
      <h3 class="mt-2 text-xl text-slate-100">
        {#if score !== null}
          {host || "This site"} scored {score}/100
        {:else}
          Your report is ready
        {/if}
      </h3>
      <p class="mt-2 text-sm text-slate-300">
        Open the report to see the summary, top issues, performance snapshot, and recommended next steps.
      </p>
      {#if locked === true}
        <p class="mt-2 text-xs text-slate-500">
          The report page will handle preview access and any paid unlock options.
        </p>
      {/if}
      <div class="mt-4">
        <Button href={previewUrl} size="lg" className="w-full rounded-xl">
          View full report
        </Button>
      </div>
    </div>
  {/if}

  {#if error}
    <p class="text-sm text-rose-300">{error}</p>
  {/if}
</div>
