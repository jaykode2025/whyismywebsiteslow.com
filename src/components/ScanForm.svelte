<script>
  import ScanProgress from "./ScanProgress.svelte";

  let { variant = "compact", initialUrl = "", showAdvanced = false } = $props();

  let url = $state(initialUrl);
  let device = $state("mobile");
  let crawlEnabled = $state(false);
  let maxLinks = $state(3);
  let visibility = $state("unlisted");
  let status = $state("idle");
  let error = $state("");
  let reportId = $state("");
  let manageToken = $state("");

  async function submit() {
    error = "";
    status = "submitting";
    reportId = "";
    manageToken = "";

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          device,
          visibility,
          crawl: { enabled: crawlEnabled, maxLinks },
        }),
      });

      if (!res.ok) throw new Error("Scan request failed");
      const data = await res.json();
      reportId = data.id;
      manageToken = data.manageToken;
      status = "queued";
    } catch (err) {
      error = err?.message ?? "Something went wrong";
      status = "error";
    }
  }
</script>

<form class="space-y-4" on:submit|preventDefault={submit}>
  <div class="flex flex-col gap-3 md:flex-row md:items-center">
    <input
      class="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-base text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
      type="url"
      placeholder="Enter a URL like https://example.com"
      bind:value={url}
      required
    />
    <button
      class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5"
      type="submit"
    >
      Run scan
    </button>
  </div>

  <div class="flex flex-wrap items-center gap-4 text-sm text-slate-300">
    <label class="flex items-center gap-2">
      <input type="radio" name="device" value="mobile" bind:group={device} />
      Mobile
    </label>
    <label class="flex items-center gap-2">
      <input type="radio" name="device" value="desktop" bind:group={device} />
      Desktop
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={crawlEnabled} />
      Crawl up to
      <input
        class="w-16 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-center"
        type="number"
        min="1"
        max="5"
        bind:value={maxLinks}
        disabled={!crawlEnabled}
      />
      pages
    </label>
    {#if showAdvanced}
      <label class="flex items-center gap-2">
        Visibility
        <select
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          bind:value={visibility}
        >
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </label>
    {/if}
  </div>

  {#if error}
    <p class="text-sm text-rose-300">{error}</p>
  {/if}

  {#if reportId}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
      <ScanProgress id={reportId} />
      {#if manageToken}
        <div class="mt-3 space-y-1 text-xs text-slate-400">
          <p>Manage token (shown once):</p>
          <code class="break-all text-slate-200">{manageToken}</code>
          <a class="block text-sky-200" href={`/r/${reportId}/manage?token=${manageToken}`}>Manage this report</a>
        </div>
      {/if}
    </div>
  {/if}
</form>
