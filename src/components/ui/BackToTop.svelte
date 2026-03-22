<script>
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";

  let showButton = false;

  function handleScroll() {
    showButton = window.scrollY > 500;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });
</script>

{#if showButton}
  <button
    on:click={scrollToTop}
    transition:fly={{ y: 20, duration: 300 }}
    aria-label="Back to top"
    class="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-white shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  </button>
{/if}
