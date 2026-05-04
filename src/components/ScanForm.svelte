<script>
  import Button from "./ui/Button.svelte";
  import ScanProgress from "./ScanProgress.svelte";

  let { variant = "compact", initialUrl = "", showAdvanced = false, csrfToken = "" } = $props();

  let url = $state(initialUrl);
  let device = $state("mobile");
  let crawlEnabled = $state(false);
  let maxLinks = $state(3);
  let visibility = $state("unlisted");
  let targetKeyword = $state("");
  let status = $state("idle");
  let error = $state("");
  let urlError = $state("");
  let reportId = $state("");
  let manageToken = $state("");

  function fireEvent(payload) {
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
        return;
      }
    } catch {
      // Fallback to fetch.
    }
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function normalizeInput(value) {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  }

  function validateUrl(value) {
    const normalized = normalizeInput(value);
    if (!normalized) {
      return { ok: false, message: "Enter a URL to scan." };
    }
    try {
      new URL(normalized);
    } catch {
      return { ok: false, message: "Enter a valid URL (include a domain like example.com)." };
    }
    return { ok: true, value: normalized };
  }

  async function submit() {
    error = "";
    urlError = "";
    status = "submitting";
    reportId = "";
    manageToken = "";

    try {
      const validation = validateUrl(url);
      if (!validation.ok) {
        urlError = validation.message;
        status = "idle";
        return;
      }
      url = validation.value;
      if (window.location.pathname === "/") {
        fireEvent({
          eventType: "homepage_cta_clicked",
          source: "scan-form",
          ctaVariant: "primary",
          offerContext: "free-scan",
          metadata: {
            path: window.location.pathname,
          },
        });
      }

      const headers = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      const res = await fetch("/api/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({
          url,
          device,
          visibility,
          crawl: { enabled: crawlEnabled, maxLinks },
          targetKeyword: targetKeyword.trim() ? targetKeyword.trim() : undefined,
        }),
      });

      if (!res.ok) {
        let message = "Scan request failed";
        try {
          const payload = await res.json();
          if (typeof payload?.error === "string") {
            message = payload.error;
          }
        } catch {
          // Keep fallback message for non-JSON responses.
        }
        throw new Error(message);
      }
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

<form class="space-y-6" on:submit|preventDefault={submit}>
  <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
    <div>
      <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Website URL</label>
      <input
        class={`mt-2 w-full rounded-2xl border bg-white/5 px-5 py-3 text-base text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 ${
          urlError ? "border-rose-400/60" : "border-white/10"
        }`}
        type="url"
        placeholder="https://example.com"
        bind:value={url}
        on:blur={() => (url = normalizeInput(url))}
        aria-invalid={urlError ? "true" : "false"}
        disabled={status === "submitting"}
        required
      />
      {#if urlError}
        <p class="mt-2 text-xs text-rose-300">{urlError}</p>
      {/if}
    </div>
    <Button type="submit" size="lg" className="w-full rounded-2xl md:w-auto" disabled={status === "submitting"}>
      {status === "submitting" ? "Starting..." : "Run scan"}
    </Button>
  </div>

  <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Device</p>
      <div class="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`rounded-full border-transparent px-4 py-2 text-xs uppercase tracking-[0.16em] ${
            device === "mobile" ? "bg-sky-400/20 text-sky-100" : "text-slate-400 hover:text-slate-200"
          }`}
          on:click={() => (device = "mobile")}
          disabled={status === "submitting"}
        >
          Mobile
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`rounded-full border-transparent px-4 py-2 text-xs uppercase tracking-[0.16em] ${
            device === "desktop" ? "bg-emerald-300/20 text-emerald-100" : "text-slate-400 hover:text-slate-200"
          }`}
          on:click={() => (device = "desktop")}
          disabled={status === "submitting"}
        >
          Desktop
        </Button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={crawlEnabled} disabled={status === "submitting"} />
        Crawl up to
      </label>
      <input
        class="w-16 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-center"
        type="number"
        min="1"
        max="5"
        bind:value={maxLinks}
        disabled={!crawlEnabled || status === "submitting"}
      />
      <span class="text-xs text-slate-500">pages</span>
    </div>
  </div>

  {#if showAdvanced}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Advanced options</p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2">
          Visibility
          <select
            class="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            bind:value={visibility}
            disabled={status === "submitting"}
          >
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>
        <label class="flex items-center gap-2">
          Primary keyword
          <input
            class="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            type="text"
            placeholder="Example: performance audit"
            bind:value={targetKeyword}
            disabled={status === "submitting"}
          />
        </label>
      </div>
      <p class="mt-3 text-xs text-slate-500">Public reports can be indexed by search engines.</p>
    </div>
  {/if}

  {#if error}
    <p class="text-sm text-rose-300">{error}</p>
  {/if}

  {#if reportId}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
      <ScanProgress id={reportId} {csrfToken} />
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
