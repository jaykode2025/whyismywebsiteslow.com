<script>
  import { onMount, onDestroy } from "svelte";
  import Button from "./Button.svelte";

  export let text = "";
  export let label = "Read Report";

  let speaking = false;
  let paused = false;
  let supported = false;
  let utterance;

  onMount(() => {
    if ("speechSynthesis" in window) {
      supported = true;
    }
  });

  onDestroy(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
    }
  });

  function toggleSpeech() {
    if (!supported) return;

    if (speaking && !paused) {
      window.speechSynthesis.pause();
      paused = true;
    } else if (speaking && paused) {
      window.speechSynthesis.resume();
      paused = false;
    } else {
      utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        speaking = false;
        paused = false;
      };

      window.speechSynthesis.speak(utterance);
      speaking = true;
      paused = false;
    }
  }

  function stopSpeech() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speaking = false;
    paused = false;
  }
</script>

{#if supported}
  <div class="flex items-center gap-2">
    <Button
      variant="ghost"
      size="sm"
      on:click={toggleSpeech}
      aria-label={speaking && !paused ? "Pause reading" : "Read aloud"}
      class="flex items-center gap-2 text-slate-400 hover:text-emerald-400"
    >
      {#if speaking && !paused}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Pause
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        {label}
      {/if}
    </Button>
    
    {#if speaking}
      <Button
        variant="ghost"
        size="sm"
        on:click={stopSpeech}
        aria-label="Stop reading"
        class="text-slate-400 hover:text-red-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16"></rect>
        </svg>
      </Button>
    {/if}
  </div>
{/if}
