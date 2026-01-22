<script lang="ts">
    import { page } from "$app/stores";
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Alert from "$lib/components/ui/alert";
    import { Spinner } from "$lib/components/ui/spinner";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import Building from "@lucide/svelte/icons/building";
    import * as m from "$lib/paraglide/messages.js";
    import { i18n } from "$lib/i18n";

    let { form } = $props();

    let isLoading = $state(false);
    let email = $state("");
    let password = $state("");

    // Get error from URL params
    const error = $derived($page.url.searchParams.get("error"));
    const errorMessage = $derived(() => {
        if (error === "CredentialsSignin") return m.invalidEmailOrPassword();
        if (error === "AccountDisabled") return m.accountDisabled();
        if (error) return m.errorOccurred();
        return null;
    });
</script>

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
                {m.welcome()}
            </h1>
            <p class="mt-1 text-muted-foreground">{m.login()}</p>
        </div>

        <!-- Login Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.signIn()}</Card.Title>
                <Card.Description>{m.login()}</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if errorMessage() || form?.error}
                    <Alert.Root variant="destructive" class="mb-4">
                        <CircleAlert class="h-4 w-4" />
                        <Alert.Title>{m.error()}</Alert.Title>
                        <Alert.Description
                            >{errorMessage() || form?.error}</Alert.Description
                        >
                    </Alert.Root>
                {/if}

                <form
                    method="POST"
                    action="?/login"
                    use:enhance={() => {
                        isLoading = true;
                        return async ({ update }) => {
                            await update();
                            isLoading = false;
                        };
                    }}
                    class="space-y-4"
                >
                    <input
                        type="hidden"
                        name="providerId"
                        value="credentials"
                    />
                    <input
                        type="hidden"
                        name="callbackUrl"
                        value={i18n.resolveRoute("/dashboard", i18n.locale)}
                    />

                    <div class="space-y-2">
                        <Label for="email">{m.email()}</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="name@example.com"
                            required
                            autocomplete="email"
                            bind:value={email}
                            disabled={isLoading}
                        />
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label for="password">{m.password()}</Label>
                            <a
                                href={i18n.resolveRoute("/forgot-password", i18n.locale)}
                                class="text-xs text-primary hover:underline"
                            >
                                {m.forgotPassword()}
                            </a>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            autocomplete="current-password"
                            bind:value={password}
                            disabled={isLoading}
                        />
                    </div>

                    <Button type="submit" class="w-full" disabled={isLoading}>
                        {#if isLoading}
                            <Spinner class="mr-2 h-4 w-4" />
                            {m.signIn()}...
                        {:else}
                            {m.signIn()}
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
