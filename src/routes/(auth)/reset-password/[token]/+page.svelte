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
    import Building from "@lucide/svelte/icons/building";
    import Eye from "@lucide/svelte/icons/eye";
    import EyeOff from "@lucide/svelte/icons/eye-off";
    import { resetPasswordSchema, type ResetPasswordSchema } from "$lib/utils/validation";
    import * as m from "$lib/paraglide/messages.js";

    let { data } = $props();

    const form = superForm<ResetPasswordSchema>(
        untrack(() => data.form),
        {
            resetForm: true
        }
    );

    const { form: formData, enhance, errors, submitting } = form;

    let showPassword = $state(false);
    let showConfirmPassword = $state(false);
</script>

<svelte:head>
    <title>{m.resetPasswordTitle()} | SvelterApp</title>
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
                {m.resetPassword()}
            </h1>
            <p class="mt-1 text-muted-foreground">
                {m.newPasswordSubtitle({ email: data.email })}
            </p>
        </div>

        <!-- Reset Password Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.newPassword()}</Card.Title>
                <Card.Description>
                    {m.chooseStrongPassword()}
                </Card.Description>
            </Card.Header>
            <Card.Content>
                {#if $errors._errors?.[0]}
                    <Alert.Root variant="destructive" class="mb-4">
                        <CircleAlert class="h-4 w-4" />
                        <Alert.Title>{m.error()}</Alert.Title>
                        <Alert.Description>{$errors._errors[0]}</Alert.Description>
                    </Alert.Root>
                {/if}

                <form method="POST" use:enhance class="space-y-4">
                    <!-- Password -->
                    <div class="space-y-2">
                        <Label for="password">{m.newPassword()}</Label>
                        <div class="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="••••••••"
                                bind:value={$formData.password}
                                disabled={$submitting}
                                required
                                autocomplete="new-password"
                                class="pr-10"
                            />
                            <button
                                type="button"
                                onclick={() => showPassword = !showPassword}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabindex="-1"
                            >
                                {#if showPassword}
                                    <EyeOff class="h-4 w-4" />
                                {:else}
                                    <Eye class="h-4 w-4" />
                                {/if}
                            </button>
                        </div>
                        {#if $errors.password}
                            <p class="text-xs text-destructive">{$errors.password}</p>
                        {:else}
                            <p class="text-xs text-muted-foreground">
                                {m.passwordRequirements()}
                            </p>
                        {/if}
                    </div>

                    <!-- Confirm Password -->
                    <div class="space-y-2">
                        <Label for="confirmPassword">{m.confirmPassword()}</Label>
                        <div class="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="••••••••"
                                bind:value={$formData.confirmPassword}
                                disabled={$submitting}
                                required
                                autocomplete="new-password"
                                class="pr-10"
                            />
                            <button
                                type="button"
                                onclick={() => showConfirmPassword = !showConfirmPassword}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabindex="-1"
                            >
                                {#if showConfirmPassword}
                                    <EyeOff class="h-4 w-4" />
                                {:else}
                                    <Eye class="h-4 w-4" />
                                {/if}
                            </button>
                        </div>
                        {#if $errors.confirmPassword}
                            <p class="text-xs text-destructive">{$errors.confirmPassword}</p>
                        {/if}
                    </div>

                    <Button type="submit" class="w-full" disabled={$submitting}>
                        {#if $submitting}
                            <Spinner class="mr-2 h-4 w-4" />
                            {m.resettingPassword()}
                        {:else}
                            {m.resetPasswordButton()}
                        {/if}
                    </Button>
                </form>
            </Card.Content>
        </Card.Root>

        <!-- Footer -->
        <p class="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SvelterApp | Saief Brahim. {m.copyright()}
        </p>
    </div>
</div>
