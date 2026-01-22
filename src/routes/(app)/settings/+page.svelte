<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import * as Alert from "$lib/components/ui/alert";
    import { Spinner } from "$lib/components/ui/spinner";
    import { toast } from "svelte-sonner";
    import * as m from "$lib/paraglide/messages.js";
    import User from "@lucide/svelte/icons/user";
    import Bell from "@lucide/svelte/icons/bell";
    import Shield from "@lucide/svelte/icons/shield";
    import Mail from "@lucide/svelte/icons/mail";
    import Lock from "@lucide/svelte/icons/lock";
    import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
    import Eye from "@lucide/svelte/icons/eye";
    import EyeOff from "@lucide/svelte/icons/eye-off";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import AlertCircle from "@lucide/svelte/icons/alert-circle";
    let { data, form }: any = $props();

    let isUpdatingProfile = $state(false);
    let isRequestingEmailChange = $state(false);
    let isChangingPassword = $state(false);
    let isCancellingEmailChange = $state(false);
    let isResendingEmailChange = $state(false);
    
    // Create stable derived values for form state to avoid unnecessary re-runs
    const formEmailChangeRequested = $derived(form?.emailChangeRequested ?? false);
    const formEmailChangeCancelled = $derived(form?.emailChangeCancelled ?? false);
    const formEmailChangeResent = $derived(form?.emailChangeResent ?? false);
    const formSuccess = $derived(form?.success ?? false);
    const formPasswordChanged = $derived(form?.passwordChanged ?? false);
    const dataPendingEmailChange = $derived(data?.pendingEmailChange !== null);
    
    // Merge form data from action result with initial data (form takes precedence)
    const passwordChangeForm = $derived(form?.passwordChangeForm ?? data?.passwordChangeForm);
    
    // Initialize state with untrack to capture initial values properly
    let emailChangeRequested = $state(untrack(() => formEmailChangeRequested || dataPendingEmailChange));
    let passwordChanged = $state(untrack(() => formPasswordChanged));
    
    // Track previous values to detect transitions
    let prevEmailChangeRequested = $state(false);
    let prevEmailChangeCancelled = $state(false);
    let prevEmailChangeResent = $state(false);
    let prevSuccess = $state(false);
    let prevPasswordChanged = $state(false);
    
    // Password visibility toggles
    let showCurrentPassword = $state(false);
    let showNewPassword = $state(false);
    let showConfirmPassword = $state(false);

    // Format expiration date
    const formatExpiration = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(dateObj);
    };

    // Handle email changed success from query param
    $effect(() => {
        if (data?.emailChanged) {
            toast.success(m.emailChangeCompleted());
            // Clear pending email change since it's been completed
            emailChangeRequested = false;
            data.pendingEmailChange = null;
        }
    });

    // Update pending email change state
    $effect(() => {
        if (data?.pendingEmailChange || form?.pendingEmailChange) {
            emailChangeRequested = true;
            if (form?.pendingEmailChange !== undefined) {
                data.pendingEmailChange = form.pendingEmailChange;
            }
        } else if (form?.pendingEmailChange === null) {
            emailChangeRequested = false;
            data.pendingEmailChange = null;
        }
    });

    // Handle form state changes with toasts (only on transitions)
    $effect(() => {
        // Email change requested
        if (formEmailChangeRequested && !prevEmailChangeRequested) {
            emailChangeRequested = true;
            data.emailChangeForm.data.newEmail = "";
            toast.success(m.emailChangeRequested());
            if (form?.pendingEmailChange) {
                data.pendingEmailChange = form.pendingEmailChange;
            }
        }
        prevEmailChangeRequested = formEmailChangeRequested;
        
        // Email change cancelled
        if (formEmailChangeCancelled && !prevEmailChangeCancelled) {
            emailChangeRequested = false;
            data.pendingEmailChange = null;
            toast.success(m.emailChangeCancelled());
        }
        prevEmailChangeCancelled = formEmailChangeCancelled;
        
        // Email change resent
        if (formEmailChangeResent && !prevEmailChangeResent) {
            if (form?.pendingEmailChange) {
                data.pendingEmailChange = form.pendingEmailChange;
            }
            toast.success(m.emailChangeConfirmationResent());
        }
        prevEmailChangeResent = formEmailChangeResent;
        
        // Profile updated
        if (formSuccess && !prevSuccess) {
            toast.success(m.profileUpdated());
        }
        prevSuccess = formSuccess;
        
        // Password changed
        if (formPasswordChanged && !prevPasswordChanged) {
            passwordChanged = true;
            if (data?.passwordChangeForm) {
                data.passwordChangeForm.data.currentPassword = "";
                data.passwordChangeForm.data.newPassword = "";
                data.passwordChangeForm.data.confirmPassword = "";
            }
            toast.success(m.passwordChangedSuccess());
        }
        prevPasswordChanged = formPasswordChanged;
    });
</script>

<div class="space-y-6 pb-6">
    <!-- Header -->
    <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">{m.settings()}</h1>
        <p class="text-muted-foreground">
            {m.settingsSubtitle()}
        </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Profile Information -->
            <Card.Root class="border shadow-sm">
                <Card.Header class="pb-4">
                    <div class="flex items-center gap-3">
                        <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <User class="size-5 text-primary" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.profileInformation()}</Card.Title>
                            <Card.Description class="mt-1">
                                {m.profileInformationSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <form method="POST" action="?/updateProfile" use:enhance={() => {
                        isUpdatingProfile = true;
                        return async ({ update }) => {
                            await update();
                            isUpdatingProfile = false;
                        };
                    }}>
                        <div class="grid gap-4 md:grid-cols-2">
                            <div class="space-y-2">
                                <Label for="firstName">{m.firstName()}</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    bind:value={data.profileForm.data.firstName}
                                    disabled={isUpdatingProfile}
                                    required
                                    class="h-10"
                                />
                                {#if data.profileForm.errors?.firstName}
                                    <p class="text-sm text-destructive mt-1">
                                        {data.profileForm.errors.firstName}
                                    </p>
                                {/if}
                            </div>
                            <div class="space-y-2">
                                <Label for="lastName">{m.lastName()}</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    bind:value={data.profileForm.data.lastName}
                                    disabled={isUpdatingProfile}
                                    required
                                    class="h-10"
                                />
                                {#if data.profileForm.errors?.lastName}
                                    <p class="text-sm text-destructive mt-1">
                                        {data.profileForm.errors.lastName}
                                    </p>
                                {/if}
                            </div>
                        </div>
                        <Separator class="my-4" />
                        <div class="flex justify-end">
                            <Button type="submit" disabled={isUpdatingProfile} size="default">
                                {#if isUpdatingProfile}
                                    <Spinner class="mr-2 size-4" />
                                    {m.saving()}
                                {:else}
                                    {m.saveChanges()}
                                {/if}
                            </Button>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>

            <!-- Email Change -->
            <Card.Root class="border shadow-sm">
                <Card.Header class="pb-4">
                    <div class="flex items-center gap-3">
                        <div class="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Mail class="size-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.changeEmail()}</Card.Title>
                            <Card.Description class="mt-1">
                                {m.changeEmailSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    {#if emailChangeRequested || data?.pendingEmailChange}
                        <Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                            <CheckCircle2 class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <Alert.Title class="text-blue-900 dark:text-blue-100">{m.emailChangeConfirmationSent()}</Alert.Title>
                            <Alert.Description class="text-blue-800 dark:text-blue-200 space-y-2">
                                <p>{m.emailChangeConfirmationSentDescription()}</p>
                                {#if data?.pendingEmailChange}
                                    <div class="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                        <p class="text-sm font-medium">
                                            {m.pendingEmailChange()}: <span class="font-semibold">{data.pendingEmailChange.newEmail}</span>
                                        </p>
                                        <p class="text-xs mt-1">
                                            {m.expiresAt()}: {formatExpiration(data.pendingEmailChange.expires)}
                                        </p>
                                    </div>
                                {/if}
                            </Alert.Description>
                        </Alert.Root>
                        
                        {#if data?.pendingEmailChange}
                            <div class="flex gap-2">
                                <form method="POST" action="?/resendEmailChangeConfirmation" use:enhance={() => {
                                    isResendingEmailChange = true;
                                    return async ({ update }) => {
                                        await update();
                                        isResendingEmailChange = false;
                                    };
                                }}>
                                    <Button 
                                        type="submit" 
                                        variant="outline" 
                                        size="sm"
                                        disabled={isResendingEmailChange}
                                    >
                                        {#if isResendingEmailChange}
                                            <Spinner class="mr-2 size-4" />
                                            {m.sending()}
                                        {:else}
                                            <Mail class="mr-2 size-4" />
                                            {m.resendConfirmation()}
                                        {/if}
                                    </Button>
                                </form>
                                <form method="POST" action="?/cancelEmailChange" use:enhance={() => {
                                    isCancellingEmailChange = true;
                                    return async ({ update }) => {
                                        await update();
                                        isCancellingEmailChange = false;
                                    };
                                }}>
                                    <Button 
                                        type="submit" 
                                        variant="outline" 
                                        size="sm"
                                        disabled={isCancellingEmailChange}
                                    >
                                        {#if isCancellingEmailChange}
                                            <Spinner class="mr-2 size-4" />
                                        {:else}
                                            {m.cancel()}
                                        {/if}
                                    </Button>
                                </form>
                            </div>
                        {/if}
                    {/if}

                    {#if data.emailChangeForm.errors?._errors && data.emailChangeForm.errors._errors.length > 0}
                        <Alert.Root variant="destructive">
                            <AlertCircle class="h-4 w-4" />
                            <Alert.Title>{m.error()}</Alert.Title>
                            <Alert.Description>
                                {data.emailChangeForm.errors._errors[0]}
                            </Alert.Description>
                        </Alert.Root>
                    {/if}

                    <div class="space-y-2">
                        <Label for="currentEmail">{m.currentEmail()}</Label>
                        <Input
                            id="currentEmail"
                            value={data.user?.email}
                            disabled
                            class="bg-muted/50 h-10"
                        />
                    </div>

                    <form method="POST" action="?/requestEmailChange" use:enhance={() => {
                        isRequestingEmailChange = true;
                        return async ({ update }) => {
                            await update();
                            isRequestingEmailChange = false;
                        };
                    }}>
                        <div class="space-y-2">
                            <Label for="newEmail">{m.newEmail()}</Label>
                            <Input
                                id="newEmail"
                                name="newEmail"
                                type="email"
                                bind:value={data.emailChangeForm.data.newEmail}
                                disabled={isRequestingEmailChange || emailChangeRequested}
                                placeholder={m.newEmailPlaceholder()}
                                required
                                class="h-10"
                            />
                            {#if data.emailChangeForm.errors?.newEmail}
                                <p class="text-sm text-destructive mt-1">
                                    {data.emailChangeForm.errors.newEmail}
                                </p>
                            {/if}
                            {#if data.emailChangeForm.errors?._errors}
                                <p class="text-sm text-destructive mt-1">
                                    {data.emailChangeForm.errors._errors[0]}
                                </p>
                            {/if}
                        </div>
                        <div class="rounded-lg bg-muted/50 p-3 mt-4">
                            <p class="text-sm text-muted-foreground flex items-start gap-2">
                                <CircleAlert class="size-4 mt-0.5 flex-shrink-0" />
                                <span>{m.emailChangeWarning()}</span>
                            </p>
                        </div>
                        <div class="flex justify-end mt-4">
                            <Button 
                                type="submit" 
                                disabled={isRequestingEmailChange || emailChangeRequested || data?.pendingEmailChange}
                                size="default"
                            >
                                {#if isRequestingEmailChange}
                                    <Spinner class="mr-2 size-4" />
                                    {m.sending()}
                                {:else}
                                    {m.sendConfirmationLink()}
                                {/if}
                            </Button>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>

            <!-- Password Change -->
            <Card.Root class="border shadow-sm">
                <Card.Header class="pb-4">
                    <div class="flex items-center gap-3">
                        <div class="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                            <Lock class="size-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.changePassword()}</Card.Title>
                            <Card.Description class="mt-1">
                                {m.changePasswordSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    {#if passwordChanged}
                        <Alert.Root class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                            <CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
                            <Alert.Title class="text-green-900 dark:text-green-100">{m.passwordChangedSuccess()}</Alert.Title>
                            <Alert.Description class="text-green-800 dark:text-green-200">
                                {m.passwordChangedDescription()}
                            </Alert.Description>
                        </Alert.Root>
                    {/if}

                    <form method="POST" action="?/changePassword" use:enhance={() => {
                        isChangingPassword = true;
                        return async ({ update }) => {
                            await update();
                            isChangingPassword = false;
                        };
                    }}>
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <Label for="currentPassword">{m.currentPassword()}</Label>
                                <div class="relative">
                                    <Input
                                        id="currentPassword"
                                        name="currentPassword"
                                        type={showCurrentPassword ? "text" : "password"}
                                        bind:value={data.passwordChangeForm.data.currentPassword}
                                        disabled={isChangingPassword || passwordChanged}
                                        required
                                        class="h-10 pr-10"
                                        placeholder={m.currentPasswordPlaceholder()}
                                    />
                                    <button
                                        type="button"
                                        onclick={() => showCurrentPassword = !showCurrentPassword}
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabindex="-1"
                                    >
                                        {#if showCurrentPassword}
                                            <EyeOff class="size-4" />
                                        {:else}
                                            <Eye class="size-4" />
                                        {/if}
                                    </button>
                                </div>
                                {#if passwordChangeForm?.errors?.currentPassword}
                                    <p class="text-sm text-destructive mt-1">
                                        {passwordChangeForm.errors.currentPassword}
                                    </p>
                                {/if}
                            </div>

                            <div class="space-y-2">
                                <Label for="newPassword">{m.newPassword()}</Label>
                                <div class="relative">
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        bind:value={data.passwordChangeForm.data.newPassword}
                                        disabled={isChangingPassword || passwordChanged}
                                        required
                                        class="h-10 pr-10"
                                        placeholder={m.newPasswordPlaceholder()}
                                    />
                                    <button
                                        type="button"
                                        onclick={() => showNewPassword = !showNewPassword}
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabindex="-1"
                                    >
                                        {#if showNewPassword}
                                            <EyeOff class="size-4" />
                                        {:else}
                                            <Eye class="size-4" />
                                        {/if}
                                    </button>
                                </div>
                                {#if passwordChangeForm?.errors?.newPassword}
                                    <p class="text-sm text-destructive mt-1">
                                        {passwordChangeForm.errors.newPassword}
                                    </p>
                                {/if}
                                <p class="text-xs text-muted-foreground mt-1">
                                    {m.passwordRequirements()}
                                </p>
                            </div>

                            <div class="space-y-2">
                                <Label for="confirmPassword">{m.confirmPassword()}</Label>
                                <div class="relative">
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        bind:value={data.passwordChangeForm.data.confirmPassword}
                                        disabled={isChangingPassword || passwordChanged}
                                        required
                                        class="h-10 pr-10"
                                        placeholder={m.confirmPasswordPlaceholder()}
                                    />
                                    <button
                                        type="button"
                                        onclick={() => showConfirmPassword = !showConfirmPassword}
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabindex="-1"
                                    >
                                        {#if showConfirmPassword}
                                            <EyeOff class="size-4" />
                                        {:else}
                                            <Eye class="size-4" />
                                        {/if}
                                    </button>
                                </div>
                                {#if passwordChangeForm?.errors?.confirmPassword}
                                    <p class="text-sm text-destructive mt-1">
                                        {passwordChangeForm.errors.confirmPassword}
                                    </p>
                                {/if}
                            </div>
                        </div>

                        {#if passwordChangeForm?.errors?._errors}
                            <Alert.Root variant="destructive" class="mt-4">
                                <CircleAlert class="h-4 w-4" />
                                <Alert.Title>{m.error()}</Alert.Title>
                                <Alert.Description>
                                    {passwordChangeForm.errors._errors[0]}
                                </Alert.Description>
                            </Alert.Root>
                        {/if}

                        <div class="flex justify-end mt-6">
                            <Button 
                                type="submit" 
                                disabled={isChangingPassword || passwordChanged}
                                size="default"
                            >
                                {#if isChangingPassword}
                                    <Spinner class="mr-2 size-4" />
                                    {m.changingPassword()}
                                {:else}
                                    {m.changePasswordButton()}
                                {/if}
                            </Button>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Account Info Sidebar -->
        <div class="space-y-6">
            <Card.Root class="border shadow-sm">
                <Card.Header>
                    <div class="flex items-center gap-2">
                        <Shield class="h-5 w-5" />
                        <Card.Title>{m.accountDetails()}</Card.Title>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-muted-foreground">{m.role()}</p>
                        <p class="text-sm font-semibold">
                            {data.user?.role?.displayName || data.user?.role}
                        </p>
                    </div>
                    <Separator />
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-muted-foreground">{m.status()}</p>
                        <div class="flex items-center gap-2">
                            <div class="size-2 rounded-full {data.user?.isActive ? 'bg-green-500' : 'bg-gray-400'}"></div>
                            <p class="text-sm font-semibold">
                                {data.user?.isActive ? m.active() : m.inactive()}
                            </p>
                        </div>
                    </div>
                    {#if data.user?.organizationId}
                        <Separator />
                        <div class="space-y-1">
                            <p class="text-sm font-medium text-muted-foreground">{m.organization()}</p>
                            <p class="text-sm font-semibold">
                                {data.user.organization?.name || data.user.organizationId}
                            </p>
                        </div>
                    {/if}
                </Card.Content>
            </Card.Root>
        </div>
    </div>
</div>
