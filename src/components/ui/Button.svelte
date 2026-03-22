<script>
  // Svelte usage (e.g. ScanForm). For Astro pages use ui/Button.astro (same API).
  export let href = undefined;
  export let type = "button";
  export let variant = "primary";
  export let size = "md";
  export let className = "";

  export let loading = false;
  export let disabled = false;

  const base =
    "inline-flex items-center justify-center rounded-full font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300/60 disabled:pointer-events-none disabled:opacity-60";
  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2 text-sm",
    lg: "px-6 py-3 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 text-slate-950 shadow-lg shadow-sky-500/20 hover:-translate-y-0.5",
    ghost: "border border-white/15 text-slate-200 hover:border-white/30 hover:text-white",
    dark: "bg-slate-900 text-slate-100 hover:bg-slate-800",
  };

  let restProps = {};
  let restClass = "";
  $: {
    const { class: cls, ...rest } = $$restProps;
    restProps = rest;
    restClass = cls ?? "";
  }

  $: classes = `${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className} ${restClass}`.trim();
</script>

{#if href}
  <a href={href} class={classes} {...restProps}><slot /></a>
{:else}
  <button type={type} class={classes} disabled={disabled || loading} {...restProps}>
    {#if loading}
      <svg class="-ml-1 mr-2 h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {/if}
    <slot />
  </button>
{/if}
