<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { enhance } from "$app/forms";
    import { Spinner } from "$lib/components/ui/spinner";
    import * as m from "$lib/paraglide/messages.js";
    import Mail from "@lucide/svelte/icons/mail";
    import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";

    let { data, form }: any = $props();
    let isSubmitting = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center p-4">
    <Card.Root class="w-full max-w-md">
        <Card.Header class="text-center">
            <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Mail class="size-6 text-primary" />
            </div>
            <Card.Title class="text-2xl">{m.confirmEmailChange()}</Card.Title>
            <Card.Description>
                {m.confirmEmailChangeSubtitle({ email: data.newEmail })}
            </Card.Description>
        </Card.Header>
        <Card.Content>
            <form method="POST" use:enhance={() => {
                isSubmitting = true;
                return async ({ update }) => {
                    await update();
                    isSubmitting = false;
                };
            }}>
                <div class="space-y-4">
                    <div class="rounded-lg border bg-muted/50 p-4">
                        <p class="text-sm font-medium text-muted-foreground mb-1">
                            {m.newEmailAddress()}
                        </p>
                        <p class="text-lg font-semibold">{data.newEmail}</p>
                    </div>
                    <Button type="submit" class="w-full" disabled={isSubmitting}>
                        {#if isSubmitting}
                            <Spinner class="mr-2 size-4" />
                            {m.confirmingEmailChange()}
                        {:else}
                            <CheckCircle2 class="mr-2 size-4" />
                            {m.confirmEmailChangeButton()}
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
