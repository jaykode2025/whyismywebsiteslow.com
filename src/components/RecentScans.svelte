<script>
  import { onMount } from 'svelte';
  import Badge from './ui/Badge.astro';

  let scans = $state([]);
  let loading = $state(true);

  async function fetchRecent() {
    try {
      // Mocking for now, but in a real app, you'd hit /api/reports/recent
      // Since your app uses static routes, this would be a client-side fetch.
      // const res = await fetch('/api/reports/recent');
      // scans = await res.json();
      
      // Temporary high-signal mock data to show the tool is alive.
      scans = [
        { url: 'lawyersite.com', score: 34, status: 'slow', time: '2m ago' },
        { url: 'saassite.io', score: 98, status: 'fast', time: '5m ago' },
        { url: 'shopifystore.com', score: 72, status: 'average', time: '12m ago' },
        { url: 'miami-realestate.net', score: 45, status: 'slow', time: '18m ago' }
      ];
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  });
</script>

<div class="rounded-3xl border border-white/10 bg-white/5 p-6 mt-10">
  <h3 class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-6">Live Audit Feed</h3>
  
  {#if loading}
    <div class="space-y-4 animate-pulse">
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
      <div class="h-10 bg-white/5 rounded-xl w-full"></div>
    </div>
  {:else}
    <ul class="space-y-4">
      {#each scans as scan}
        <li class="flex items-center justify-between group">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              {scan.url}
            </span>
            <span class="text-[10px] text-slate-500 uppercase tracking-wider">{scan.time}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class={`text-sm font-bold ${scan.score >= 90 ? 'text-emerald-400' : scan.score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
              {scan.score}
            </span>
            <div class={`h-2 w-2 rounded-full ${scan.score >= 90 ? 'bg-emerald-400' : scan.score >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
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
