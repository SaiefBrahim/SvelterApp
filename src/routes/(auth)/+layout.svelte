<script lang="ts">
    import type { Snippet } from "svelte";
    import LanguageSwitcher from "$lib/components/auth/LanguageSwitcher.svelte";

    let { children }: { children: Snippet } = $props();
</script>

<!-- Auth layout - minimal, centered -->
<div
    class="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-16"
>
    {@render children()}
    
    <!-- Footer with Language Switcher -->
    <footer class="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-4 border-t bg-background/80 backdrop-blur-sm py-2 px-4 z-10">
        <LanguageSwitcher />
    </footer>
</div>
