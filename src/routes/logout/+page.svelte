<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { Spinner } from "$lib/components/ui/spinner";

    onMount(() => {
        // Submit the form automatically
        const form = document.querySelector("form");
        form?.requestSubmit();
    });
</script>

<div class="flex min-h-screen items-center justify-center">
    <div class="flex flex-col items-center gap-4">
        <Spinner class="h-8 w-8" />
        <p class="text-muted-foreground">Signing out...</p>
        <form method="POST" class="hidden">
            <button type="submit">Sign out</button>
        </form>
    </div>
</div>
