<script lang="ts">
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Alert from "$lib/components/ui/alert";
    import { Spinner } from "$lib/components/ui/spinner";
    import { Badge } from "$lib/components/ui/badge";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import Building from "@lucide/svelte/icons/building";
    import Eye from "@lucide/svelte/icons/eye";
    import EyeOff from "@lucide/svelte/icons/eye-off";
    import Shield from "@lucide/svelte/icons/shield";
    import Building2 from "@lucide/svelte/icons/building-2";
    import Mail from "@lucide/svelte/icons/mail";
    import * as m from "$lib/paraglide/messages.js";

    let { data, form } = $props();

    let firstName = $state("");
    let lastName = $state("");
    let password = $state("");
    let confirmPassword = $state("");
    let showPassword = $state(false);
    let showConfirmPassword = $state(false);
    let isSubmitting = $state(false);
</script>

<svelte:head>
    <title>{m.acceptInvite()} | SvelterApp</title>
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
                {m.acceptInvitation()}
            </h1>
            <p class="mt-1 text-muted-foreground">
                {m.acceptInvitationSubtitle({ organization: data.invite.organization?.name || m.theOrganization() })}
            </p>
        </div>

        <!-- Invite Details Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.inviteDetails()}</Card.Title>
                <Card.Description>{m.inviteDetailsSubtitle()}</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-3">
                <div class="flex items-center gap-3">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p class="text-sm font-medium">{m.email()}</p>
                        <p class="text-sm text-muted-foreground">{data.invite.email}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Shield class="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p class="text-sm font-medium">{m.role()}</p>
                        <Badge variant="secondary">{data.invite.role.displayName}</Badge>
                    </div>
                </div>
                {#if data.invite.organization}
                    <div class="flex items-center gap-3">
                        <Building2 class="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p class="text-sm font-medium">{m.organization()}</p>
                            <p class="text-sm text-muted-foreground">{data.invite.organization.name}</p>
                        </div>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- Signup Card -->
        <Card.Root class="border-border/50 shadow-xl">
            <Card.Header class="space-y-1 pb-4">
                <Card.Title class="text-2xl">{m.createAccount()}</Card.Title>
                <Card.Description>{m.createAccountSubtitle()}</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if (form as any)?.error}
                    <Alert.Root variant="destructive" class="mb-4">
                        <CircleAlert class="h-4 w-4" />
                        <Alert.Title>{m.error()}</Alert.Title>
                        <Alert.Description>{(form as any).error}</Alert.Description>
                    </Alert.Root>
                {/if}

                <form
                    method="POST"
                    use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                            await update();
                            isSubmitting = false;
                        };
                    }}
                    class="space-y-4"
                >
                    <!-- Name Fields -->
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="firstName">{m.firstName()}</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                placeholder="John"
                                bind:value={firstName}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="lastName">{m.lastName()}</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                placeholder="Doe"
                                bind:value={lastName}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
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
                                bind:value={password}
                                disabled={isSubmitting}
                                required
                                autocomplete="new-password"
                                class="pr-10"
                                minlength={8}
                            />
                            <button
                                type="button"
                                onclick={() => showPassword = !showPassword}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabindex="-1"
                                disabled={isSubmitting}
                            >
                                {#if showPassword}
                                    <EyeOff class="h-4 w-4" />
                                {:else}
                                    <Eye class="h-4 w-4" />
                                {/if}
                            </button>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            {m.passwordRequirements()}
                        </p>
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
                                bind:value={confirmPassword}
                                disabled={isSubmitting}
                                required
                                autocomplete="new-password"
                                class="pr-10"
                                minlength={8}
                            />
                            <button
                                type="button"
                                onclick={() => showConfirmPassword = !showConfirmPassword}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabindex="-1"
                                disabled={isSubmitting}
                            >
                                {#if showConfirmPassword}
                                    <EyeOff class="h-4 w-4" />
                                {:else}
                                    <Eye class="h-4 w-4" />
                                {/if}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        class="w-full"
                        disabled={isSubmitting || !firstName || !lastName || !password || !confirmPassword}
                    >
                        {#if isSubmitting}
                            <Spinner class="mr-2 h-4 w-4" />
                            {m.acceptingInvitation()}
                        {:else}
                            {m.acceptInvitation()}
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
