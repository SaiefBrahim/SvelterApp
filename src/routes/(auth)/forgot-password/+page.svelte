<script lang="ts">
    import { superForm } from "sveltekit-superforms";
    import { untrack } from "svelte";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Alert from "$lib/components/ui/alert";
    import { Spinner } from "$lib/components/ui/spinner";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
    import Building from "@lucide/svelte/icons/building";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";
    import { forgotPasswordSchema, type ForgotPasswordSchema } from "$lib/utils/validation";
    import { i18n } from "$lib/i18n";
    import * as m from "$lib/paraglide/messages.js";

    let { data, form: actionData } = $props();

    let isSuccess = $state(false);

    const form = superForm<ForgotPasswordSchema>(
        untrack(() => data.form),
        {
            resetForm: true,
            onResult: ({ result }) => {
                if (result.type === 'success') {
                    // Check if success is in result.data
                    const resultData = result.data;
                    if (resultData && typeof resultData === 'object') {
                        if ('success' in resultData && resultData.success === true) {
                            isSuccess = true;
                        }
                    }
                }
            }
        }
    );

    const { form: formData, enhance, errors, submitting } = form;

    // Also check actionData for success state (from page reload after form submission)
    $effect(() => {
        if (actionData && typeof actionData === 'object' && 'success' in actionData && actionData.success) {
            isSuccess = true;
        }
    });
</script>

<svelte:head>
    <title>{m.forgotPasswordTitle()} | SvelterApp</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
    <div class="w-full max-w-md space-y-6">
        <!-- Logo and Title -->
        <div class="text-center">
            <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            >
                <Building class="h-8 w-8" />
            </div>
            <h1 class="mt-4 text-3xl font-bold tracking-tight">
                {m.forgotPasswordTitle()}
            </h1>
            <p class="mt-1 text-muted-foreground">{m.forgotPasswordSubtitle()}</p>
        </div>

        <!-- Forgot Password Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.resetPassword()}</Card.Title>
                <Card.Description>
                    {m.resetPasswordSubtitle()}
                </Card.Description>
            </Card.Header>
            <Card.Content>
                {#if isSuccess || (data as any).success || (actionData as any)?.success}
                    <div class="space-y-4">
                        <Alert.Root variant="default" class="border-green-500/50 bg-green-500/10">
                            <CheckCircle2 class="h-4 w-4 text-green-500" />
                            <Alert.Title class="text-green-500">{m.resetPasswordSent()}</Alert.Title>
                            <Alert.Description>
                                {m.resetPasswordSentDescription()}
                            </Alert.Description>
                        </Alert.Root>
                        <Button
                            href={i18n.resolveRoute("/login", i18n.locale)}
                            class="w-full"
                        >
                            <ArrowLeft class="mr-2 h-4 w-4" />
                            {m.backToLogin()}
                        </Button>
                    </div>
                {:else}
                    {#if $errors._errors?.[0]}
                        <Alert.Root variant="destructive" class="mb-4">
                            <CircleAlert class="h-4 w-4" />
                            <Alert.Title>{m.error()}</Alert.Title>
                            <Alert.Description>{$errors._errors[0]}</Alert.Description>
                        </Alert.Root>
                    {/if}

                    <form method="POST" use:enhance class="space-y-4">
                        <div class="space-y-2">
                            <Label for="email">{m.email()}</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="name@example.com"
                                bind:value={$formData.email}
                                disabled={$submitting}
                                required
                                autocomplete="email"
                            />
                            {#if $errors.email}
                                <p class="text-xs text-destructive">{$errors.email}</p>
                            {/if}
                        </div>

                        <Button type="submit" class="w-full" disabled={$submitting}>
                            {#if $submitting}
                                <Spinner class="mr-2 h-4 w-4" />
                                {m.sending()}
                            {:else}
                                {m.sendResetLink()}
                            {/if}
                        </Button>
                    </form>
                {/if}
            </Card.Content>
            {#if !isSuccess && !(data as any).success && !(actionData as any)?.success}
                <Card.Footer class="flex flex-col gap-2">
                    <a
                        href={i18n.resolveRoute("/login", i18n.locale)}
                        class="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft class="h-4 w-4" />
                        {m.backToSignIn()}
                    </a>
                </Card.Footer>
            {/if}
        </Card.Root>

        <!-- Footer -->
        <p class="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SvelterApp | Saief Brahim. {m.copyright()}
        </p>
    </div>
</div>
