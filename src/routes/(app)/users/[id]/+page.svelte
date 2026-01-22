<script lang="ts">
    import { page } from "$app/stores";
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import * as Select from "$lib/components/ui/select";
    import * as Alert from "$lib/components/ui/alert";
    import { Separator } from "$lib/components/ui/separator";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Save from "@lucide/svelte/icons/save";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import * as m from "$lib/paraglide/messages.js";
    import { i18n } from "$lib/i18n";
    import { toast } from "svelte-sonner";

    import { untrack } from "svelte";

    let { data, form } = $props();
    let isLoading = $state(false);

    let userForm = $state(
        untrack(() => ({
            firstName: data.targetUser.firstName,
            lastName: data.targetUser.lastName,
            email: data.targetUser.email,
            roleId: data.targetUser.roleId,
            isActive: data.targetUser.isActive,
        })),
    );

    const getRoleDisplayName = (roleId: string) => {
        return (
            data.roles.find((r: any) => r.id === roleId)?.displayName ||
            m.selectRole()
        );
    };
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <Button
            href={i18n.resolveRoute("/users", i18n.locale)}
            variant="ghost"
            class="-ml-4"
        >
            <ArrowLeft class="mr-2 h-4 w-4" />
            {m.backToUsers()}
        </Button>

        <form
            method="POST"
            action="?/delete"
            use:enhance={() => {
                if (!confirm(m.deleteUserConfirm()))
                    return;
                isLoading = true;
                return async ({ update }) => {
                    await update();
                    isLoading = false;
                };
            }}
        >
            <Button variant="destructive" type="submit" disabled={isLoading}>
                <Trash2 class="mr-2 h-4 w-4" />
                {m.deleteUser()}
            </Button>
        </form>
    </div>

    <div>
        <h1 class="text-3xl font-bold tracking-tight">{m.editUser()}</h1>
        <p class="text-muted-foreground">{m.modifyUserProfileSubtitle()}</p>
    </div>

    {#if form?.error}
        <Alert.Root variant="destructive">
            <CircleAlert class="h-4 w-4" />
            <Alert.Title>{m.error()}</Alert.Title>
            <Alert.Description>{form.error}</Alert.Description>
        </Alert.Root>
    {/if}

    <form
        method="POST"
        action="?/update"
        use:enhance={() => {
            isLoading = true;
            return async ({ update }) => {
                await update();
                isLoading = false;
                toast.success(m.userUpdatedSuccessfully());
            };
        }}
    >
        <Card.Root>
            <Card.Header>
                <Card.Title>{m.userInformation()}</Card.Title>
                <Card.Description>
                    {m.updateNamesContact()}
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="firstName">{m.firstName()}</Label>
                        <Input
                            id="firstName"
                            name="firstName"
                            bind:value={userForm.firstName}
                            required
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="lastName">{m.lastName()}</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            bind:value={userForm.lastName}
                            required
                        />
                    </div>
                </div>
                <div class="space-y-2">
                    <Label for="email">{m.email()}</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        bind:value={userForm.email}
                        required
                    />
                </div>
            </Card.Content>
        </Card.Root>

        <div class="mt-6 grid gap-6 md:grid-cols-2">
            <Card.Root>
                <Card.Header>
                    <Card.Title>{m.accessRole()}</Card.Title>
                    <Card.Description>{m.managePermissions()}</Card.Description>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="space-y-2">
                        <Label>{m.systemRole()}</Label>
                        <Select.Root
                            type="single"
                            bind:value={userForm.roleId}
                            onValueChange={(v) => (userForm.roleId = v)}
                        >
                            <Select.Trigger>
                                {getRoleDisplayName(userForm.roleId)}
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
                            value={userForm.roleId}
                        />
                    </div>

                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <Card.Title>{m.accountStatus()}</Card.Title>
                    <Card.Description>{m.toggleUserAccess()}</Card.Description>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="flex items-center space-x-2">
                        <Checkbox
                            id="isActive"
                            bind:checked={userForm.isActive}
                            onCheckedChange={(v) => (userForm.isActive = !!v)}
                        />
                        <div class="grid gap-1.5 leading-none">
                            <Label
                                for="isActive"
                                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {m.activeAccount()}
                            </Label>
                            <p class="text-sm text-muted-foreground">
                                {m.userCanLogin()}
                            </p>
                        </div>
                        <input
                            type="hidden"
                            name="isActive"
                            value={userForm.isActive}
                        />
                    </div>
                </Card.Content>
            </Card.Root>
        </div>

        <div class="mt-6 flex justify-end gap-4">
            <Button
                href={i18n.resolveRoute("/users", i18n.locale)}
                variant="outline"
                disabled={isLoading}
            >
                {m.cancel()}
            </Button>
            <Button type="submit" disabled={isLoading}>
                {#if isLoading}
                    <div
                        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    ></div>
                {/if}
                <Save class="mr-2 h-4 w-4" />
                {m.saveChanges()}
            </Button>
        </div>
    </form>
</div>
