<script>
  export let href = undefined;
  export let type = "button";
  export let variant = "primary";
  export let size = "md";
  export let className = "";

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
  <button type={type} class={classes} {...restProps}><slot /></button>
{/if}
