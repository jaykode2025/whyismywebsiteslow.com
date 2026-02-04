<script>
  import Button from "./ui/Button.svelte";

  let { url = "", title = "" } = $props();
  let copied = $state(false);
  let copiedEmbed = $state(false);

  const embedCode = $derived(
    `<iframe src=\"${url}\" title=\"${title}\" width=\"100%\" height=\"720\" loading=\"lazy\" style=\"border:0;border-radius:16px;overflow:hidden;\"></iframe>`
  );

  async function copyText(text, kind) {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "link") {
        copied = true;
        setTimeout(() => (copied = false), 1500);
      } else {
        copiedEmbed = true;
        setTimeout(() => (copiedEmbed = false), 1500);
      }
    } catch {
      // fallback: do nothing
    }
  }
</script>

<div class="space-y-4">
  <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Report link</p>
    <div class="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
      <code class="flex-1 break-all text-xs text-slate-200">{url}</code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="border-white/10 text-xs uppercase tracking-[0.18em] text-slate-200 hover:border-sky-400/60 hover:text-sky-100"
        on:click={() => copyText(url, "link")}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  </div>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Embed</p>
    <div class="mt-2 flex flex-col gap-3">
      <code class="block break-all text-xs text-slate-200">{embedCode}</code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="self-start border-white/10 text-xs uppercase tracking-[0.18em] text-slate-200 hover:border-emerald-300/60 hover:text-emerald-100"
        on:click={() => copyText(embedCode, "embed")}
      >
        {copiedEmbed ? "Copied" : "Copy embed"}
      </Button>
    </div>
  </div>
</div>
