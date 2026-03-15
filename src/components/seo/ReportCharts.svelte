<script lang="ts">
  import ProofCharts from "./ProofCharts.svelte";

  type ChartDatum = {
    label: string;
    score: number;
  };

  export let cwvScores: ChartDatum[] = [];
  export let lighthouse: ChartDatum[] = [];
  export let issues: Array<{ label: string; impact: number }> = [];
</script>

<ProofCharts {cwvScores} {lighthouse} {issues} />
