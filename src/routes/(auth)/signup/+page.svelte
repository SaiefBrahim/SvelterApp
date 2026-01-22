<script lang="ts">
    import { enhance } from "$app/forms";
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
    import { signupSchema, type SignupSchema } from "$lib/utils/validation";
    import { i18n } from "$lib/i18n";
    import * as m from "$lib/paraglide/messages.js";

    let { data } = $props();

    const form = superForm<SignupSchema>(
        untrack(() => (data as any).form),
        {
            resetForm: true
        }
    );

    const { form: formData, errors, submitting } = form;

    let showPassword = $state(false);
    let showConfirmPassword = $state(false);
</script>

<svelte:head>
    <title>{m.signUp()} | SvelterApp</title>
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
                {m.createAccountTitle()}
            </h1>
            <p class="mt-1 text-muted-foreground">{m.signUpSubtitle()}</p>
        </div>

        <!-- Signup Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.signUp()}</Card.Title>
                <Card.Description>{m.createAccountDescription()}</Card.Description>
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
                    <!-- Name Fields -->
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="firstName">{m.firstName()}</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                placeholder="John"
                                bind:value={$formData.firstName}
                                disabled={$submitting}
                                required
                            />
                            {#if $errors.firstName}
                                <p class="text-xs text-destructive">{$errors.firstName}</p>
                            {/if}
                        </div>
                        <div class="space-y-2">
                            <Label for="lastName">{m.lastName()}</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                placeholder="Doe"
                                bind:value={$formData.lastName}
                                disabled={$submitting}
                                required
                            />
                            {#if $errors.lastName}
                                <p class="text-xs text-destructive">{$errors.lastName}</p>
                            {/if}
                        </div>
                    </div>

                    <!-- Email -->
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

                    <!-- Password -->
                    <div class="space-y-2">
                        <Label for="password">{m.password()}</Label>
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
                            {m.creatingAccount()}
                        {:else}
                            {m.createAccountButton()}
                        {/if}
                    </Button>
                </form>
            </Card.Content>
            <Card.Footer class="flex flex-col gap-2">
                <p class="text-center text-sm text-muted-foreground">
                    {m.alreadyHaveAccount()}{" "}
                    <a
                        href={i18n.resolveRoute("/login", i18n.locale)}
                        class="font-medium text-primary hover:underline"
                    >
                        {m.signInLink()}
                    </a>
                </p>
            </Card.Footer>
        </Card.Root>

        <!-- Footer -->
        <p class="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SvelterApp | Saief Brahim. {m.copyright()}
        </p>
    </div>
</div>
