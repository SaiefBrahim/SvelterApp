<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import * as Card from "$lib/components/ui/card";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { Spinner } from "$lib/components/ui/spinner";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { toast } from "svelte-sonner";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";
    import Shield from "@lucide/svelte/icons/shield";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Search from "@lucide/svelte/icons/search";
    import Users from "@lucide/svelte/icons/users";
    import Key from "@lucide/svelte/icons/key";
    import FileText from "@lucide/svelte/icons/file-text";
    import Mail from "@lucide/svelte/icons/mail";
    import Monitor from "@lucide/svelte/icons/monitor";
    import CheckSquare from "@lucide/svelte/icons/check-square";
    import Square from "@lucide/svelte/icons/square";
    import * as m from "$lib/paraglide/messages.js";
    import { i18n } from "$lib/i18n";

    let { data, form } = $props();

    const isReadOnly = $derived(!data.canManage);
    let selectedPermissionIds = $state(new Set<string>());
    let showDeleteDialog = $state(false);
    let searchQuery = $state("");
    let expandedResources = $state(new Set<string>());
    let isUpdating = $state(false);
    let isUpdatingPermissions = $state(false);

    const resourceIcons: Record<string, any> = {
        users: Users,
        roles: Key,
        audit_logs: FileText,
        invites: Mail,
        sessions: Monitor
    };

    // Initialize from data
    $effect(() => {
        selectedPermissionIds = new Set<string>(data.selectedPermissionIds);
    });
    let isDeleting = $state(false);

    const groupedPermissions = $derived.by(() => {
        const grouped: Record<string, typeof data.permissions> = {};
        for (const permission of data.permissions) {
            if (!grouped[permission.resource]) {
                grouped[permission.resource] = [];
            }
            grouped[permission.resource].push(permission);
        }
        return grouped;
    });

    const filteredPermissions = $derived.by(() => {
        if (!searchQuery.trim()) return groupedPermissions;
        
        const filtered: Record<string, typeof data.permissions> = {};
        const query = searchQuery.toLowerCase();
        
        for (const [resource, permissions] of Object.entries(groupedPermissions)) {
            const matching = permissions.filter(
                (p) =>
                    p.action.toLowerCase().includes(query) ||
                    p.resource.toLowerCase().includes(query) ||
                    (p.description?.toLowerCase().includes(query) ?? false)
            );
            if (matching.length > 0) {
                filtered[resource] = matching;
            }
        }
        return filtered;
    });

    const totalPermissions = $derived(data.permissions?.length ?? 0);
    const selectedCount = $derived(selectedPermissionIds.size);

    function togglePermission(permissionId: string, checked: boolean) {
        const next = new Set(selectedPermissionIds);
        if (checked) {
            next.add(permissionId);
        } else {
            next.delete(permissionId);
        }
        selectedPermissionIds = next;
    }

    function toggleResource(resource: string, permissions: typeof data.permissions) {
        const resourcePermissionIds = permissions.map((p) => p.id);
        const allSelected = resourcePermissionIds.every((id) => selectedPermissionIds.has(id));
        
        const next = new Set(selectedPermissionIds);
        if (allSelected) {
            resourcePermissionIds.forEach((id) => next.delete(id));
        } else {
            resourcePermissionIds.forEach((id) => next.add(id));
        }
        selectedPermissionIds = next;
    }

    function toggleAll() {
        if (selectedPermissionIds.size === totalPermissions) {
            selectedPermissionIds = new Set();
        } else {
            selectedPermissionIds = new Set(data.permissions.map((p) => p.id));
        }
    }

    function getResourceSelectionState(resource: string, permissions: typeof data.permissions) {
        const resourceIds = permissions.map((p) => p.id);
        const selected = resourceIds.filter((id) => selectedPermissionIds.has(id)).length;
        if (selected === 0) return "none";
        if (selected === resourceIds.length) return "all";
        return "partial";
    }

    function formatResourceName(resource: string): string {
        return resource
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    // Expand all resources by default
    $effect(() => {
        if (data.permissions && data.permissions.length > 0) {
            expandedResources = new Set(Object.keys(groupedPermissions));
        }
    });

    $effect(() => {
        if ((form as any)?.success) {
            toast.success(m.actionCompleted());
        }
    });
</script>

<svelte:head>
    <title>{data.role.displayName} | {m.roles()}</title>
</svelte:head>

<div class="space-y-6">
    <Button
        href={i18n.resolveRoute("/roles", i18n.locale)}
        variant="ghost"
        class="-ml-4"
    >
        <ArrowLeft class="mr-2 h-4 w-4" />
        {m.backToRoles()}
    </Button>

    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield class="size-6" />
            </div>
            <div>
                <h1 class="text-3xl font-bold tracking-tight">
                    {data.role.displayName}
                </h1>
                <p class="text-muted-foreground">{data.role.name}</p>
            </div>
        </div>
        {#if data.role.isSystem}
            <Badge class="bg-primary/10 text-primary">{m.systemRole()}</Badge>
        {:else}
            <Badge variant="secondary">{m.customRole()}</Badge>
        {/if}
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
            <Card.Root>
                <Card.Header>
                    <Card.Title>{m.roleDetails()}</Card.Title>
                    <Card.Description>{m.roleDetailsSubtitle()}</Card.Description>
                </Card.Header>
                <Card.Content>
                    <form method="POST" action="?/update" use:enhance={() => {
                        isUpdating = true;
                        return async ({ update }) => {
                            await update();
                            isUpdating = false;
                        };
                    }} class="space-y-4">
                        <div class="space-y-2">
                            <Label for="displayName">{m.displayName()}</Label>
                            <Input
                                id="displayName"
                                name="displayName"
                                value={data.role.displayName}
                                disabled={isReadOnly || isUpdating}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="description">{m.description()}</Label>
                            <textarea
                                id="description"
                                name="description"
                                class="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isReadOnly || isUpdating}
                            >{data.role.description || ""}</textarea>
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="space-y-2">
                                <Label>{m.level()}</Label>
                                <Input value={data.role.level} disabled />
                            </div>
                            <div class="space-y-2">
                                <Label>{m.users()}</Label>
                                <Input value={data.role._count.users} disabled />
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <Button type="submit" disabled={isReadOnly || isUpdating}>
                                {#if isUpdating}
                                    <Spinner class="mr-2 h-4 w-4" />
                                {/if}
                                {m.saveChanges()}
                            </Button>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <div class="flex items-center justify-between">
                        <div>
                            <Card.Title>{m.permissions()}</Card.Title>
                            <Card.Description>
                                {m.permissionsSubtitle()} ({selectedCount} of {totalPermissions} selected)
                            </Card.Description>
                        </div>
                        {#if totalPermissions > 0 && !isReadOnly}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={toggleAll}
                            >
                                {#if selectedCount === totalPermissions}
                                    <Square class="mr-2 h-4 w-4" />
                                    Deselect All
                                {:else}
                                    <CheckSquare class="mr-2 h-4 w-4" />
                                    Select All
                                {/if}
                            </Button>
                        {/if}
                    </div>
                </Card.Header>
                <Card.Content>
                    <form method="POST" action="?/updatePermissions" use:enhance={() => {
                        isUpdatingPermissions = true;
                        return async ({ update }) => {
                            await update();
                            isUpdatingPermissions = false;
                        };
                    }} class="space-y-6">
                        {#if data.permissions && data.permissions.length > 0}
                            <!-- Search Bar -->
                            <div class="relative">
                                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search permissions by action, resource, or description..."
                                    class="pl-9"
                                    bind:value={searchQuery}
                                    disabled={isReadOnly || isUpdatingPermissions}
                                />
                            </div>

                            <!-- Permissions List -->
                            <div class="space-y-4">
                                {#each Object.entries(filteredPermissions) as [resource, permissions]}
                                    {@const ResourceIcon = resourceIcons[resource] || Shield}
                                    {@const selectionState = getResourceSelectionState(resource, permissions)}
                                    {@const isExpanded = expandedResources.has(resource)}
                                    
                                    <div class="rounded-lg border bg-card">
                                        <!-- Resource Header -->
                                        {#if isReadOnly}
                                                <div class="flex items-center justify-between p-4">
                                                    <div class="flex items-center gap-3">
                                                        <div class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                            <ResourceIcon class="size-4" />
                                                        </div>
                                                        <div>
                                                            <p class="font-semibold text-sm">
                                                                {formatResourceName(resource)}
                                                            </p>
                                                            <p class="text-xs text-muted-foreground">
                                                                {permissions.length} {permissions.length !== 1 ? m.permissions() : m.permission()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <Badge
                                                            variant={selectionState === "all" ? "default" : selectionState === "partial" ? "secondary" : "outline"}
                                                            class="text-xs"
                                                        >
                                                            {selectionState === "all"
                                                                ? m.all()
                                                                : selectionState === "partial"
                                                                ? `${permissions.filter((p) => selectedPermissionIds.has(p.id)).length}/${permissions.length}`
                                                                : m.none()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                        {:else}
                                            <button
                                                    type="button"
                                                    class="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors text-left"
                                                    onclick={() => {
                                                        const next = new Set(expandedResources);
                                                        if (isExpanded) {
                                                            next.delete(resource);
                                                        } else {
                                                            next.add(resource);
                                                        }
                                                        expandedResources = next;
                                                    }}
                                                >
                                                    <div class="flex items-center gap-3">
                                                        <div class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                            <ResourceIcon class="size-4" />
                                                        </div>
                                                        <div>
                                                            <p class="font-semibold text-sm">
                                                                {formatResourceName(resource)}
                                                            </p>
                                                            <p class="text-xs text-muted-foreground">
                                                                {permissions.length} {permissions.length !== 1 ? m.permissions() : m.permission()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <Badge
                                                            variant={selectionState === "all" ? "default" : selectionState === "partial" ? "secondary" : "outline"}
                                                            class="text-xs"
                                                        >
                                                            {selectionState === "all"
                                                                ? m.all()
                                                                : selectionState === "partial"
                                                                ? `${permissions.filter((p) => selectedPermissionIds.has(p.id)).length}/${permissions.length}`
                                                                : m.none()}
                                                        </Badge>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={(e) => {
                                                                e.stopPropagation();
                                                                toggleResource(resource, permissions);
                                                            }}
                                                        >
                                                            {selectionState === "all" ? m.deselect() : m.selectAllResource()}
                                                        </Button>
                                                    </div>
                                            </button>
                                        {/if}

                                        <!-- Permissions List -->
                                        {#if isExpanded}
                                            <div class="border-t p-4 pt-3">
                                                    <div class="grid gap-3 sm:grid-cols-2">
                                                        {#each permissions as permission}
                                                            <label
                                                                class="group flex items-start gap-3 rounded-md border p-3 transition-all {isReadOnly ? '' : 'cursor-pointer hover:border-primary/50 hover:bg-accent/50'} {selectedPermissionIds.has(permission.id) ? "border-primary bg-primary/5" : ""}"
                                                            >
                                                                <Checkbox
                                                                    checked={selectedPermissionIds.has(permission.id)}
                                                                    onCheckedChange={(checked) =>
                                                                        togglePermission(permission.id, checked === true)
                                                                    }
                                                                    disabled={isReadOnly || isUpdatingPermissions}
                                                                    class="mt-0.5"
                                                                />
                                                                <div class="flex-1 space-y-1">
                                                                    <div class="flex items-center gap-2">
                                                                        <span class="text-sm font-medium">
                                                                            {permission.action}
                                                                        </span>
                                                                        {#if selectedPermissionIds.has(permission.id)}
                                                                            <Badge variant="secondary" class="text-xs">
                                                                                {m.selected()}
                                                                            </Badge>
                                                                        {/if}
                                                                    </div>
                                                                    {#if permission.description}
                                                                        <p class="text-xs text-muted-foreground leading-relaxed">
                                                                            {permission.description}
                                                                        </p>
                                                                    {/if}
                                                                </div>
                                                                {#if selectedPermissionIds.has(permission.id)}
                                                                    <input
                                                                        type="hidden"
                                                                        name="permissionIds"
                                                                        value={permission.id}
                                                                    />
                                                                {/if}
                                                            </label>
                                                        {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>

                            {#if Object.keys(filteredPermissions).length === 0}
                                <div class="text-center py-12">
                                    <Search class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p class="text-sm font-medium text-muted-foreground">
                                        {m.noPermissionsMatching({ query: searchQuery })}
                                    </p>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        {m.tryAdjustingSearch()}
                                    </p>
                                </div>
                            {/if}
                        {:else}
                            <div class="text-center py-12">
                                <Shield class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p class="text-sm font-medium text-muted-foreground">
                                    {m.noPermissionsAvailable()}
                                </p>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {m.ensurePermissionsSeeded()}
                                </p>
                            </div>
                        {/if}

                        <Separator />

                        <div class="flex items-center justify-between">
                            <div class="text-sm text-muted-foreground">
                                {m.permissionsSelected({ selected: selectedCount, total: totalPermissions })}
                            </div>
                            <div class="flex justify-end">
                                <Button type="submit" disabled={isReadOnly || isUpdatingPermissions}>
                                    {#if isUpdatingPermissions}
                                        <Spinner class="mr-2 h-4 w-4" />
                                    {/if}
                                    {m.updatePermissions()}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>
        </div>

        <div class="space-y-6">
            <Card.Root>
                <Card.Header>
                    <Card.Title>{m.roleSummary()}</Card.Title>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div>
                        <p class="text-sm font-medium">{m.permissions()}</p>
                        <p class="text-sm text-muted-foreground">
                            {data.role._count.permissions}
                        </p>
                    </div>
                    <Separator />
                    <div>
                        <p class="text-sm font-medium">{m.createdAt()}</p>
                        <p class="text-sm text-muted-foreground">
                            {new Date(data.role.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    {#if data.canDelete && data.canManage}
                        <Separator />
                        <Button
                            variant="destructive"
                            class="w-full"
                            onclick={() => (showDeleteDialog = true)}
                        >
                            <Trash2 class="mr-2 h-4 w-4" />
                            {m.deleteRole()}
                        </Button>
                    {/if}
                </Card.Content>
            </Card.Root>
        </div>
    </div>
</div>

<AlertDialog.Root bind:open={showDeleteDialog}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{m.deleteRole()}</AlertDialog.Title>
            <AlertDialog.Description>
                {m.deleteRoleWarning({ roleName: data.role.displayName })}
                {#if data.role._count.users > 0}
                    <br />
                    <br />
                    <strong>{m.warning()}:</strong> {m.deleteRoleUsersWarning({ count: data.role._count.users })}
                {/if}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel onclick={() => (showDeleteDialog = false)}>
                {m.cancel()}
            </AlertDialog.Cancel>
            <form
                method="POST"
                action="?/delete"
                use:enhance={() => {
                    isDeleting = true;
                    return async ({ update }) => {
                        await update();
                        isDeleting = false;
                    };
                }}
            >
                <Button type="submit" variant="destructive" disabled={isDeleting || data.role._count.users > 0}>
                    {#if isDeleting}
                        <Spinner class="mr-2 h-4 w-4" />
                    {/if}
                    {m.deleteAction()}
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
