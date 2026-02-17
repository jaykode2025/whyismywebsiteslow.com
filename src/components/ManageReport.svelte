<script>
  import Button from "./ui/Button.svelte";

  let { id, token = "" } = $props();
  let status = $state("idle");
  let message = $state("");

  async function handleDelete() {
    status = "loading";
    message = "";
    try {
      const res = await fetch(`/api/report/${id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manageToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      status = "done";
      message = "Report deleted.";
    } catch (err) {
      status = "error";
      message = err?.message ?? "Unable to delete";
    }
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-slate-300">Use your manage token to delete or regenerate reports.</p>
  <Button
    type="button"
    variant="ghost"
    className="border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
    on:click={handleDelete}
    disabled={!token || status === "loading"}
  >
    Delete report
  </Button>
  {#if message}
    <p class={status === "error" ? "text-rose-300" : "text-emerald-200"}>{message}</p>
  {/if}
</div>
