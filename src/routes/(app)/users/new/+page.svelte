<script lang="ts">
    import { untrack } from "svelte";
    import { superForm } from "sveltekit-superforms";
    import * as Card from "$lib/components/ui/card";
    import * as Form from "$lib/components/ui/form";
    import * as Select from "$lib/components/ui/select";
    import * as Alert from "$lib/components/ui/alert";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Spinner } from "$lib/components/ui/spinner";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";
    import { toast } from "svelte-sonner";
    import { i18n } from "$lib/i18n";
    import * as m from "$lib/paraglide/messages.js";

    import {
        createUserSchema,
        type CreateUserSchema,
    } from "$lib/utils/validation";
    import type { PageData, ActionData } from "./$types";

    let { data, form: actionData } = $props<{ data: any; form: any }>();

    const form = superForm<CreateUserSchema>(
        untrack(() => data.form),
        {
            onResult: ({ result }) => {
                if (result.type === "redirect") {
                    toast.success(m.userCreatedSuccessfully());
                }
            },
        },
    );

    const { form: formData, enhance, errors, submitting } = form;

    // Get role display name
    function getRoleDisplayName(roleId: string): string {
        const role = data.roles.find(
            (r: { id: string; displayName: string }) => r.id === roleId,
        );
        return role?.displayName || m.selectRole();
    }
</script>

<svelte:head>
    <title>{m.createUser()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <!-- Back Button -->
    <Button
        href={i18n.resolveRoute("/users", i18n.locale)}
        variant="ghost"
        class="-ml-4"
    >
        <ArrowLeft class="mr-2 h-4 w-4" />
        {m.backToUsers()}
    </Button>

    <!-- Page Header -->
    <div>
        <h1 class="text-3xl font-bold tracking-tight">{m.createUser()}</h1>
        <p class="text-muted-foreground">{m.addNewUserSubtitle()}</p>
    </div>

    <!-- Form Card -->
    <Card.Root>
        <Card.Content class="pt-6">
            {#if actionData?.error}
                <Alert.Root variant="destructive" class="mb-6">
                    <CircleAlert class="h-4 w-4" />
                    <Alert.Title>{m.error()}</Alert.Title>
                    <Alert.Description>{actionData.error}</Alert.Description>
                </Alert.Root>
            {/if}
            <form method="POST" use:enhance class="space-y-6">
                <!-- Name Fields -->
                <div class="grid gap-4 sm:grid-cols-2">
                    <Form.Field {form} name="firstName">
                        <Form.Control>
                            {#snippet children({ props })}
                                <Form.Label>{m.firstName()}</Form.Label>
                                <Input
                                    {...props}
                                    bind:value={$formData.firstName}
                                    placeholder="John"
                                />
                            {/snippet}
                        </Form.Control>
                        <Form.FieldErrors />
                    </Form.Field>

                    <Form.Field {form} name="lastName">
                        <Form.Control>
                            {#snippet children({ props })}
                                <Form.Label>{m.lastName()}</Form.Label>
                                <Input
                                    {...props}
                                    bind:value={$formData.lastName}
                                    placeholder="Doe"
                                />
                            {/snippet}
                        </Form.Control>
                        <Form.FieldErrors />
                    </Form.Field>
                </div>

                <!-- Email -->
                <Form.Field {form} name="email">
                    <Form.Control>
                        {#snippet children({ props })}
                            <Form.Label>{m.email()}</Form.Label>
                            <Input
                                {...props}
                                type="email"
                                bind:value={$formData.email}
                                placeholder="john@example.com"
                            />
                        {/snippet}
                    </Form.Control>
                    <Form.FieldErrors />
                </Form.Field>

                <!-- Password Fields -->
                <div class="grid gap-4 sm:grid-cols-2">
                    <Form.Field {form} name="password">
                        <Form.Control>
                            {#snippet children({ props })}
                                <Form.Label>{m.password()}</Form.Label>
                                <Input
                                    {...props}
                                    type="password"
                                    bind:value={$formData.password}
                                    placeholder="••••••••"
                                />
                            {/snippet}
                        </Form.Control>
                        <Form.Description>
                            {m.passwordRequirements()}
                        </Form.Description>
                        <Form.FieldErrors />
                    </Form.Field>

                    <Form.Field {form} name="confirmPassword">
                        <Form.Control>
                            {#snippet children({ props })}
                                <Form.Label>{m.confirmPassword()}</Form.Label>
                                <Input
                                    {...props}
                                    type="password"
                                    bind:value={$formData.confirmPassword}
                                    placeholder="••••••••"
                                />
                            {/snippet}
                        </Form.Control>
                        <Form.FieldErrors />
                    </Form.Field>
                </div>

                <!-- Role -->
                <Form.Field {form} name="roleId">
                    <Form.Control>
                        {#snippet children({ props })}
                            <Form.Label>{m.role()}</Form.Label>
                            <Select.Root
                                type="single"
                                value={$formData.roleId}
                                onValueChange={(v) => {
                                    if (v) $formData.roleId = v;
                                }}
                            >
                                <Select.Trigger {...props}>
                                    {getRoleDisplayName($formData.roleId)}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each data.roles as role}
                                        <Select.Item value={role.id}>
                                            {role.displayName}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                            <input
                                type="hidden"
                                name="roleId"
                                value={$formData.roleId}
                            />
                        {/snippet}
                    </Form.Control>
                    <Form.FieldErrors />
                </Form.Field>

                <!-- Active Status -->
                <Form.Field {form} name="isActive">
                    <Form.Control>
                        {#snippet children({ props })}
                            <div class="flex items-center gap-2">
                                <Checkbox
                                    {...props}
                                    checked={$formData.isActive}
                                    onCheckedChange={(v) =>
                                        ($formData.isActive = !!v)}
                                />
                                <Form.Label class="!mt-0">{m.active()}</Form.Label>
                            </div>
                            <input
                                type="hidden"
                                name="isActive"
                                value={$formData.isActive}
                            />
                        {/snippet}
                    </Form.Control>
                    <Form.Description>
                        {m.inactiveUsersCannotLogin()}
                    </Form.Description>
                </Form.Field>

                <!-- Actions -->
                <div class="flex justify-end gap-4">
                    <Button
                        href={i18n.resolveRoute("/users", i18n.locale)}
                        variant="outline">{m.cancel()}</Button
                    >
                    <Button type="submit" disabled={$submitting}>
                        {#if $submitting}
                            <Spinner class="mr-2 h-4 w-4" />
                        {/if}
                        {m.createUser()}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
