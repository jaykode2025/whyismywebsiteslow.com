<script>
  let { id } = $props();
  let status = $state("queued");
  let error = $state("");
  let reportUrl = $state("");

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
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  });
</script>

<div class="space-y-2">
  <p class="text-sm text-slate-200">
    {#if status === "queued"}Scan queued. Warming up engines...
    {:else if status === "running"}Scanning now. Building your report...
    {:else if status === "done"}Report ready.
    {:else}Scan status: {status}
    {/if}
  </p>
  {#if reportUrl}
    <a class="inline-flex items-center gap-2 text-sm text-sky-200" href={reportUrl}>
      View report →
    </a>
  {/if}
  {#if error}
    <p class="text-sm text-rose-300">{error}</p>
  {/if}
</div>
