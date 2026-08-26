<script>
  /**
   * Score dial for a report's headline 0-100.
   *
   * Previously the arc geometry was wrong: `circumference` was derived from a
   * radius of 42 while both circles rendered at r="48", so the dash maths ran
   * against a circumference ~12% short of the real one. A "100" never closed
   * the ring and every score under-drew its arc. Both now share one radius.
   *
   * The arc colour tracks the score band, and the grade letter is rendered
   * alongside it, so the band is never communicated by colour alone.
   */
  let { score = 0, grade = null, label = "score", size = 140 } = $props();

  const RADIUS = 54;
  const STROKE = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const VIEW = 128;

  let normalized = $derived(Math.min(100, Math.max(0, Number(score) || 0)));

  // Animate from 0 on mount so the dial reads as a measurement being taken.
  // The site's global prefers-reduced-motion rule only neutralises CSS
  // animation, so this JS one has to opt out on its own.
  let shown = $state(0);
  $effect(() => {
    const target = normalized;
    const reduceMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      shown = target;
      return;
    }
    const start = performance.now();
    const from = shown;
    const DURATION = 900;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      // easeOutCubic
      shown = from + (target - from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  let offset = $derived(CIRCUMFERENCE - (shown / 100) * CIRCUMFERENCE);

  let band = $derived(
    normalized >= 90
      ? { color: "#34d399", tone: "Good" }
      : normalized >= 70
        ? { color: "#38bdf8", tone: "Fair" }
        : normalized >= 50
          ? { color: "#fbbf24", tone: "Poor" }
          : { color: "#fb7185", tone: "Critical" }
  );

  let derivedGrade = $derived(
    grade ??
      (normalized >= 90 ? "A" : normalized >= 80 ? "B" : normalized >= 70 ? "C" : normalized >= 60 ? "D" : "F")
  );
</script>

<div class="inline-flex flex-col items-center gap-2">
  <div class="relative" style={`width:${size}px;height:${size}px`}>
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Score ${Math.round(normalized)} out of 100, grade ${derivedGrade}`}
    >
      <!-- Track -->
      <circle
        cx={VIEW / 2}
        cy={VIEW / 2}
        r={RADIUS}
        stroke="rgba(148,163,184,0.15)"
        stroke-width={STROKE}
        fill="none"
      />
      <!-- Value arc -->
      <circle
        cx={VIEW / 2}
        cy={VIEW / 2}
        r={RADIUS}
        stroke={band.color}
        stroke-width={STROKE}
        stroke-linecap="round"
        fill="none"
        stroke-dasharray={CIRCUMFERENCE}
        stroke-dashoffset={offset}
        transform={`rotate(-90 ${VIEW / 2} ${VIEW / 2})`}
        style={`filter:drop-shadow(0 0 6px ${band.color}55)`}
      />
    </svg>

    <!-- Centre readout as HTML: real text, selectable and screen-reader safe. -->
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="font-display text-4xl leading-none tabular-nums text-slate-50">
        {Math.round(shown)}
      </span>
      <span class="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
    </div>
  </div>

  <!-- Grade + band label: the non-colour channel for the same information. -->
  <div class="flex items-center gap-2">
    <span
      class="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
      style={`background:${band.color}22;color:${band.color}`}
    >
      {derivedGrade}
    </span>
    <span class="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{band.tone}</span>
  </div>
</div>
