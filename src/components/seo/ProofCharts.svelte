<script lang="ts">
  import { onMount } from "svelte";
  import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

  type ChartDatum = {
    label: string;
    score: number;
  };

  export let cwvScores: ChartDatum[] = [];
  export let lighthouse: ChartDatum[] = [];
  export let issues: Array<{ label: string; impact: number }> = [];

  let cwvCanvas: HTMLCanvasElement | null = null;
  let lighthouseCanvas: HTMLCanvasElement | null = null;
  let issuesCanvas: HTMLCanvasElement | null = null;

  Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

  onMount(() => {
    const charts: Chart[] = [];
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: "rgba(148, 163, 184, 0.9)" },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
        x: {
          ticks: { color: "rgba(148, 163, 184, 0.9)" },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
      },
      plugins: {
        legend: { display: false },
      },
    } as const;

    if (cwvCanvas && cwvScores.length > 0) {
      charts.push(
        new Chart(cwvCanvas, {
          type: "bar",
          data: {
            labels: cwvScores.map((item) => item.label),
            datasets: [{ data: cwvScores.map((item) => item.score), backgroundColor: "#38bdf8" }],
          },
          options: commonOptions,
        })
      );
    }

    if (lighthouseCanvas && lighthouse.length > 0) {
      charts.push(
        new Chart(lighthouseCanvas, {
          type: "bar",
          data: {
            labels: lighthouse.map((item) => item.label),
            datasets: [{ data: lighthouse.map((item) => item.score), backgroundColor: "#a78bfa" }],
          },
          options: commonOptions,
        })
      );
    }

    if (issuesCanvas && issues.length > 0) {
      charts.push(
        new Chart(issuesCanvas, {
          type: "bar",
          data: {
            labels: issues.map((item) => item.label),
            datasets: [{ data: issues.map((item) => item.impact), backgroundColor: "#f59e0b" }],
          },
          options: commonOptions,
        })
      );
    }

    return () => {
      for (const chart of charts) chart.destroy();
    };
  });
</script>

<div class="grid gap-5 lg:grid-cols-3">
  <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
    <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Core Web Vitals</p>
    <div class="mt-3 h-52">
      <canvas bind:this={cwvCanvas} aria-label="Core Web Vitals chart"></canvas>
    </div>
  </div>
  <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
    <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Lighthouse</p>
    <div class="mt-3 h-52">
      <canvas bind:this={lighthouseCanvas} aria-label="Lighthouse score chart"></canvas>
    </div>
  </div>
  <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
    <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Issue impact</p>
    <div class="mt-3 h-52">
      <canvas bind:this={issuesCanvas} aria-label="Issue impact chart"></canvas>
    </div>
  </div>
</div>
