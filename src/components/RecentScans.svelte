<script>
  import { onMount } from 'svelte';

  let scans = $state([]);
  let loading = $state(true);

  async function fetchRecent() {
    try {
      const res = await fetch('/api/reports/recent');

      if (!res.ok) {
        throw new Error(`Failed to fetch recent scans: ${res.status}`);
      }

      const data = await res.json();
      scans = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(e);

      // Safe fallback with example audits
      scans = [
        { url: 'lawyersite.com', score: 34, time: '2m ago' },
        { url: 'saassite.io', score: 98, time: '5m ago' },
        { url: 'shopifystore.com', score: 72, time: '12m ago' },
        { url: 'miami-realestate.net', score: 45, time: '18m ago' }
      ];
    } finally {
      loading = false;
    }
  }

  function scoreTextClass(score) {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  }

  function scoreDotClass(score) {
    if (score >= 90) return 'bg-emerald-400';
    if (score >= 70) return 'bg-amber-400';
    return 'bg-rose-400';
  }

  onMount(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="rounded-3xl border border-white/10 bg-white/5 p-6 mt-10">
  <h3 class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-6">Recent Audit Examples</h3>
  
  {#if loading}
    <div class="space-y-4 animate-pulse">
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
    </div>
  {:else if scans.length === 0}
    <div class="text-sm text-slate-500 text-center py-8">
      No recent audits yet.
    </div>
  {:else}
    <ul class="space-y-4">
      {#each scans as scan}
        <li class="flex items-center justify-between group">
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-slate-200 group-hover:text-sky-400 transition-colors truncate">
              {scan.url}
            </span>
            <span class="text-[10px] text-slate-500 uppercase tracking-wider">
              {scan.time}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class={`text-sm font-bold ${scoreTextClass(scan.score)}`}>
              {scan.score}
            </span>
            <div class={`h-2 w-2 rounded-full ${scoreDotClass(scan.score)}`}></div>
          </div>
        </li>
      {/each}
    </ul>
    
    <div class="mt-8 pt-6 border-t border-white/5 text-center">
      <p class="text-xs text-slate-500 mb-4">Your site next?</p>
      <a href="/scan" class="inline-block text-xs font-bold text-sky-400 hover:text-sky-300 uppercase tracking-widest">
        Audit My Site →
      </a>
    </div>
  {/if}
</div>
