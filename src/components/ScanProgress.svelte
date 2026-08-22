<script>
  import { onDestroy } from "svelte";
  import Button from "./ui/Button.svelte";

  let { id, csrfToken = "" } = $props();
  let status = $state("queued");
  let error = $state("");
  let timer = $state(null);
  let score = $state(null);
  let host = $state("");
  let locked = $state(null);
  let retryRequest = $state(null);
  let retrying = $state(false);
  let copyState = $state("idle");
  let attempts = $state(0);
  let timedOut = $state(false);
  const previewUrl = $derived(id ? `/report/${id}` : "");

  // ~2 minutes of 2s polling. If a scan hasn't finished by then, stop polling
  // silently and tell the user instead of leaving them on the progress bar
  // forever (e.g. if a worker crashed without ever writing a final status).
  const MAX_POLL_ATTEMPTS = 60;

  async function poll() {
    if (!id) return;
    attempts += 1;
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
        retryRequest = data.request ?? null;
      }
    } catch {
      error = "Unable to fetch scan status";
    }

    if (status !== "done" && status !== "failed" && attempts >= MAX_POLL_ATTEMPTS) {
      timedOut = true;
      if (timer) clearInterval(timer);
    }
  }

  async function retryScan() {
    if (!retryRequest || retrying) return;
    retrying = true;
    error = "";

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify(retryRequest),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Retry failed");
      }

      status = "queued";
      retryRequest = null;
      score = null;
      host = "";
      locked = null;
      copyState = "idle";
      attempts = 0;
      timedOut = false;
      id = data.id;
      poll();
      timer = setInterval(poll, 2000);
    } catch (err) {
      error = err?.message ?? "Retry failed";
      status = "failed";
    } finally {
      retrying = false;
    }
  }

  function checkAgain() {
    timedOut = false;
    attempts = 0;
    poll();
    timer = setInterval(poll, 2000);
  }

  async function copyReportId() {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      copyState = "copied";
    } catch {
      copyState = "failed";
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

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  const progress = $derived(
    status === "queued" ? 25 : status === "running" ? 65 : status === "done" ? 100 : 35
  );
</script>

<div class="space-y-3" aria-live="polite" aria-atomic="true">
  <div
    class="h-2 w-full overflow-hidden rounded-full bg-white/10"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={progress}
    aria-label="Scan progress"
  >
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

  {#if timedOut && status !== "done" && status !== "failed"}
    <div class="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
      <p class="text-sm text-amber-200">
        This is taking longer than usual. Your scan may still finish in the background.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" className="rounded-xl" on:click={checkAgain}>
          Check again
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-xl border-white/10" on:click={copyReportId}>
          Copy report ID
        </Button>
      </div>
      <p class="text-xs text-slate-400">
        Report ID: <code class="text-slate-200">{id}</code>
        {#if copyState === "copied"}
          <span class="ml-2 text-emerald-300">Copied</span>
        {:else if copyState === "failed"}
          <span class="ml-2 text-amber-300">Clipboard unavailable</span>
        {/if}
        — if it doesn't show up soon, contact support with this ID.
      </p>
    </div>
  {/if}

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
    <div class="space-y-3 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4">
      <p class="text-sm text-rose-200">{error}</p>
      {#if status === "failed"}
        <div class="flex flex-wrap items-center gap-2">
          {#if retryRequest}
            <Button type="button" size="sm" className="rounded-xl" loading={retrying} on:click={retryScan}>
              Retry scan
            </Button>
          {:else}
            <Button href="/scan" size="sm" className="rounded-xl">
              Start a new scan
            </Button>
          {/if}
          <Button type="button" size="sm" variant="ghost" className="rounded-xl border-white/10" on:click={copyReportId}>
            Copy report ID
          </Button>
        </div>
        <p class="text-xs text-slate-400">
          Report ID: <code class="text-slate-200">{id}</code>
          {#if copyState === "copied"}
            <span class="ml-2 text-emerald-300">Copied</span>
          {:else if copyState === "failed"}
            <span class="ml-2 text-amber-300">Clipboard unavailable</span>
          {/if}
        </p>
      {/if}
    </div>
  {/if}
</div>
