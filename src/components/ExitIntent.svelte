<script>
  import { onMount } from 'svelte';
  import Button from './ui/Button.svelte';

  let show = $state(false);
  let dismissed = $state(false);

  function handleMouseLeave(e) {
    if (e.clientY <= 0 && !dismissed) {
      show = true;
    }
  }

  function close() {
    show = false;
    dismissed = true;
    localStorage.setItem('exit_intent_dismissed', 'true');
  }

  onMount(() => {
    if (localStorage.getItem('exit_intent_dismissed') === 'true') {
      dismissed = true;
    }
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  });
</script>

{#if show}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in" on:click={close}>
    <div class="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl animate-scale-up" on:click|stopPropagation>
      <button class="absolute top-4 right-4 text-slate-500 hover:text-slate-300" on:click={close}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <div class="text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        
        <h2 class="text-3xl font-bold text-slate-100 mb-4">Don't leave your revenue to chance.</h2>
        <p class="text-slate-400 mb-8">
          Most sites lose 15-20% of conversions just because of load time. Get our $12/mo monitoring to ensure you stay fast.
        </p>

        <div class="flex flex-col gap-3">
          <a href="/billing" class="w-full rounded-xl bg-sky-500 px-6 py-4 font-bold text-white hover:bg-sky-400 transition-all text-center">
            Start Monitoring — $12/mo
          </a>
          <button class="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-semibold text-slate-300 hover:bg-white/10 transition-all" on:click={close}>
            Maybe later
          </button>
        </div>

        <p class="mt-6 text-xs text-slate-500">
          Join 2,000+ businesses optimizing their performance.
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scale-up {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-fade-in { animation: fade-in 0.2s ease-out; }
  .animate-scale-up { animation: scale-up 0.2s ease-out; }
</style>
