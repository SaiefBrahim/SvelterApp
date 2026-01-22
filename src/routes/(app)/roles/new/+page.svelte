<script lang="ts">
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Badge } from "$lib/components/ui/badge";
    import { Spinner } from "$lib/components/ui/spinner";
    import { toast } from "svelte-sonner";
    import ArrowLeft from "@lucide/svelte/icons/arrow-left";
    import Shield from "@lucide/svelte/icons/shield";
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

    let name = $state("");
    let displayName = $state("");
    let description = $state("");
    let level = $state(1);
    let selectedPermissionIds = $state(new Set<string>());
    let searchQuery = $state("");
    let expandedResources = $state(new Set<string>());
    let isCreating = $state(false);

    const resourceIcons: Record<string, any> = {
        users: Users,
        roles: Key,
        audit_logs: FileText,
        invites: Mail,
        sessions: Monitor
    };

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
    <title>Create Role | {m.roles()}</title>
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

    <div class="flex items-center gap-3">
        <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield class="size-6" />
        </div>
        <div>
            <h1 class="text-3xl font-bold tracking-tight">{m.createRole()}</h1>
            <p class="text-muted-foreground">{m.createRoleSubtitle()}</p>
        </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
            <Card.Root>
                <Card.Header>
                    <Card.Title>{m.roleDetails()}</Card.Title>
                    <Card.Description>{m.basicInformationRole()}</Card.Description>
                </Card.Header>
                <Card.Content>
                    <form method="POST" use:enhance class="space-y-4">
                        <div class="space-y-2">
                            <Label for="name">{m.roleNameCode()}</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g., CUSTOM_MANAGER"
                                bind:value={name}
                                disabled={isCreating}
                                required
                            />
                            <p class="text-xs text-muted-foreground">
                                {m.uniqueIdentifierRole()}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <Label for="displayName">{m.displayName()}</Label>
                            <Input
                                id="displayName"
                                name="displayName"
                                placeholder="e.g., Custom Manager"
                                bind:value={displayName}
                                disabled={isCreating}
                                required
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="description">{m.description()}</Label>
                            <textarea
                                id="description"
                                name="description"
                                class="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={m.describeRolePurpose()}
                                bind:value={description}
                                disabled={isCreating}
                            ></textarea>
                        </div>
                        <div class="space-y-2">
                            <Label for="level">{m.level()}</Label>
                            <Input
                                id="level"
                                name="level"
                                type="number"
                                min="1"
                                max="3"
                                bind:value={level}
                                disabled={isCreating}
                                required
                            />
                            <p class="text-xs text-muted-foreground">
                                {m.hierarchyLevel()}
                            </p>
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
                                {m.selectPermissionsRole({ selected: selectedCount, total: totalPermissions })}
                            </Card.Description>
                        </div>
                        {#if totalPermissions > 0}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={toggleAll}
                            >
                                {#if selectedCount === totalPermissions}
                                    <Square class="mr-2 h-4 w-4" />
                                    {m.deselectAll()}
                                {:else}
                                    <CheckSquare class="mr-2 h-4 w-4" />
                                    {m.selectAll()}
                                {/if}
                            </Button>
                        {/if}
                    </div>
                </Card.Header>
                <Card.Content>
                    <form method="POST" use:enhance class="space-y-6">
                        <input type="hidden" name="name" value={name} />
                        <input type="hidden" name="displayName" value={displayName} />
                        <input type="hidden" name="description" value={description} />
                        <input type="hidden" name="level" value={level} />
                        
                        {#if data.permissions && data.permissions.length > 0}
                            <!-- Search Bar -->
                            <div class="relative">
                                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder={m.searchPermissionsPlaceholder()}
                                    class="pl-9"
                                    bind:value={searchQuery}
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

                                            <!-- Permissions List -->
                                            {#if isExpanded}
                                                <div class="border-t p-4 pt-3">
                                                    <div class="grid gap-3 sm:grid-cols-2">
                                                        {#each permissions as permission}
                                                            <label
                                                                class="group flex items-start gap-3 rounded-md border p-3 transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer {selectedPermissionIds.has(permission.id) ? "border-primary bg-primary/5" : ""}"
                                                            >
                                                                <Checkbox
                                                                    checked={selectedPermissionIds.has(permission.id)}
                                                                    onCheckedChange={(checked) =>
                                                                        togglePermission(permission.id, checked === true)
                                                                    }
                                                                    disabled={isCreating}
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
                            <div class="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    href={i18n.resolveRoute("/roles", i18n.locale)}
                                    disabled={isCreating}
                                >
                                    {m.cancel()}
                                </Button>
                                <Button type="submit" disabled={!name || !displayName || isCreating}>
                                    {#if isCreating}
                                        <Spinner class="mr-2 h-4 w-4" />
                                    {/if}
                                    {m.createRole()}
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
                    <Card.Title>{m.roleInformation()}</Card.Title>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div>
                        <p class="text-sm font-medium">{m.levelHierarchy()}</p>
                        <p class="text-sm text-muted-foreground">
                            {m.level3FullAccess()}<br />
                            {m.level2ManagerAccess()}<br />
                            {m.level1OperatorAccess()}
                        </p>
                    </div>
                    <Separator />
                    <div>
                        <p class="text-sm font-medium">{m.permissions()}</p>
                        <p class="text-sm text-muted-foreground">
                            {m.permissionsSelectedCount({ count: selectedPermissionIds.size })}
                        </p>
                    </div>
                </Card.Content>
            </Card.Root>
        </div>
    </div>
</div>
