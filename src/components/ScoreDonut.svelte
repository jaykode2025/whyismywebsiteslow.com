<script>
  let { score = 0 } = $props();
  const radius = 42;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  let normalized = $derived(Math.min(100, Math.max(0, score)));
  let offset = $derived(circumference - (normalized / 100) * circumference);
  let color = $derived(
    normalized >= 90 ? "#34d399" : normalized >= 80 ? "#38bdf8" : normalized >= 70 ? "#fbbf24" : "#fb7185"
  );
</script>

<svg width="120" height="120" viewBox="0 0 120 120" class="glow">
  <defs>
    <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#a78bfa" />
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="48" stroke="rgba(148,163,184,0.2)" stroke-width={stroke} fill="none" />
  <circle
    cx="60"
    cy="60"
    r="48"
    stroke="url(#scoreGradient)"
    stroke-width={stroke}
    stroke-linecap="round"
    fill="none"
    stroke-dasharray={circumference}
    stroke-dashoffset={offset}
    transform="rotate(-90 60 60)"
  />
  <text x="60" y="60" text-anchor="middle" dominant-baseline="middle" fill={color} font-size="24" font-weight="700">
    {Math.round(normalized)}
  </text>
  <text x="60" y="78" text-anchor="middle" fill="rgba(226,232,240,0.7)" font-size="10">
    score
  </text>
</svg>
