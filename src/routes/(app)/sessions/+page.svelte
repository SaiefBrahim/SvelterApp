<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Spinner } from "$lib/components/ui/spinner";
    import Search from "@lucide/svelte/icons/search";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import MonitorDot from "@lucide/svelte/icons/monitor-dot";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import X from "@lucide/svelte/icons/x";
    import Filter from "@lucide/svelte/icons/filter";
    import Columns from "@lucide/svelte/icons/columns";
    import GripVertical from "@lucide/svelte/icons/grip-vertical";
    import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import { toast } from "svelte-sonner";
    import { ColumnManager, type ColumnConfig } from "$lib/utils/column-manager";
    import * as m from "$lib/paraglide/messages.js";

    let { data, form } = $props() as any;

    let searchQuery = $state("");
    let selectedRoleId = $state("");
    let selectedLimit = $state(10);
    let isSearching = $state(false);
    let revokeSessionId = $state<string | null>(null);
    let showRevokeDialog = $state(false);
    let isRevoking = $state(false);
    let showColumnManager = $state(false);
    let searchInputRef: HTMLInputElement | null = $state(null);

    // Column Management
    const columnManager = new ColumnManager({
        storageKey: 'sessions-table-columns',
        defaultColumns: [
            { id: 'user', label: m.user(), visible: true, order: 0, sortable: true },
            { id: 'role', label: m.role(), visible: true, order: 1, sortable: false },
            { id: 'expires', label: m.expires(), visible: true, order: 2, sortable: true },
            { id: 'sessionId', label: m.sessionId(), visible: true, order: 3, sortable: false },
            { id: 'actions', label: m.actions(), visible: true, order: 4, sortable: false }
        ]
    });

    let columns = $state<ColumnConfig[]>(columnManager.loadColumns());
    let draggedColumnId: string | null = $state(null);

    const visibleColumns = $derived(columnManager.getVisibleColumns(columns));

    function toggleColumn(columnId: string) {
        columns = columnManager.toggleColumn(columns, columnId);
    }

    function handleDragStart(columnId: string) {
        draggedColumnId = columnId;
    }

    function handleDragOver(columnId: string, event: DragEvent) {
        event.preventDefault();
        if (draggedColumnId && draggedColumnId !== columnId) {
            const fromIndex = columns.findIndex(col => col.id === draggedColumnId);
            const toIndex = columns.findIndex(col => col.id === columnId);
            if (fromIndex !== -1 && toIndex !== -1) {
                columns = columnManager.reorderColumns(columns, fromIndex, toIndex);
            }
        }
    }

    function handleDragEnd() {
        draggedColumnId = null;
    }

    function resetColumns() {
        columns = columnManager.resetColumns();
    }

    // Initialize from data
    let isInitialized = $state(false);
    $effect(() => {
        if (!isInitialized) {
            searchQuery = data.filters?.search || "";
            selectedRoleId = data.filters?.roleId || "";
            selectedLimit = data.limit || 10;
            lastAppliedFilters = {
                search: searchQuery,
                roleId: selectedRoleId
            };
            isInitialized = true;
        }
    });

    // Auto-filter logic
    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAppliedFilters = $state({ search: "", roleId: "" });

    $effect(() => {
        if (!isInitialized) return;
        if (searchQuery === lastAppliedFilters.search) return;
        
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        if (searchQuery.length === 0 || searchQuery.length >= 3) {
            searchDebounceTimer = setTimeout(() => {
                if (searchQuery !== lastAppliedFilters.search) {
                    lastAppliedFilters.search = searchQuery;
                    applyFilters(true);
                }
            }, 300);
        }
        
        return () => {
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
        };
    });

    // Handle sorting
    function handleSort(column: string) {
        const url = new URL($page.url);
        const currentSortBy = data.sortBy || 'expires';
        const currentSortOrder = data.sortOrder || 'desc';
        
        if (currentSortBy === column) {
            url.searchParams.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            url.searchParams.set('sortBy', column);
            url.searchParams.set('sortOrder', 'asc');
        }
        url.searchParams.set('page', '1');
        goto(url.toString(), { invalidateAll: true });
    }

    // Handle filter changes
    function applyFilters(preserveFocus = false) {
        const url = new URL($page.url);
        url.searchParams.set('page', '1');
        
        if (searchQuery) {
            url.searchParams.set('search', searchQuery);
        } else {
            url.searchParams.delete('search');
        }
        
        if (selectedRoleId) {
            url.searchParams.set('roleId', selectedRoleId);
        } else {
            url.searchParams.delete('roleId');
        }
        
        let cursorPos: number | null = null;
        if (preserveFocus && searchInputRef) {
            const input = searchInputRef as HTMLInputElement;
            if (document.activeElement === input) {
                cursorPos = input.selectionStart;
            }
        }
        
        goto(url.toString(), { 
            invalidateAll: true,
            replaceState: true,
            noScroll: true
        }).then(() => {
            if (cursorPos !== null && searchInputRef) {
                const input = searchInputRef as HTMLInputElement;
                setTimeout(() => {
                    input.focus({ preventScroll: true });
                    if (cursorPos <= input.value.length) {
                        input.setSelectionRange(cursorPos, cursorPos);
                    }
                }, 0);
            }
        });
    }

    // Handle limit change
    function handleLimitChange(limit: number) {
        const url = new URL($page.url);
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('page', '1');
        goto(url.toString(), { invalidateAll: true });
    }

    // Clear all filters
    function clearFilters() {
        searchQuery = "";
        selectedRoleId = "";
        applyFilters();
    }

    const hasActiveFilters = $derived(
        searchQuery !== "" || selectedRoleId !== ""
    );

    function openRevokeDialog(sessionId: string) {
        revokeSessionId = sessionId;
        showRevokeDialog = true;
    }

    function goToPage(pageNum: number) {
        const url = new URL($page.url);
        url.searchParams.set("page", pageNum.toString());
        goto(url.toString(), { invalidateAll: true });
    }

    // Smart pagination
    function getPaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | 'ellipsis')[] = [];
        
        if (currentPage <= 4) {
            for (let i = 1; i <= 5; i++) {
                pages.push(i);
            }
            pages.push('ellipsis');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(1);
            pages.push('ellipsis');
            for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            pages.push('ellipsis');
            pages.push(currentPage - 1);
            pages.push(currentPage);
            pages.push(currentPage + 1);
            pages.push('ellipsis');
            pages.push(totalPages);
        }
        
        return pages;
    }

    const paginationPages = $derived(getPaginationPages(data.currentPage, data.pages));

    $effect(() => {
        if (form?.success) {
            toast.success(m.actionCompleted());
            showRevokeDialog = false;
            revokeSessionId = null;
        }
    });
</script>

<svelte:head>
    <title>{m.sessions()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <div>
        <h1 class="text-3xl font-bold tracking-tight">{m.sessions()}</h1>
        <p class="text-muted-foreground">
            {m.sessionsSubtitle()}
        </p>
    </div>

    <!-- Enhanced Filters -->
    <Card.Root>
        <Card.Content class="p-6">
            <div class="space-y-4">
                <!-- Search Row -->
                <div class="flex gap-3">
                    <div class="relative flex-1">
                        <Search
                            class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            type="search"
                            placeholder={m.searchByNameOrEmailSessions()}
                            class="pl-12 h-11 text-base"
                            bind:value={searchQuery}
                            bind:ref={searchInputRef}
                            onkeydown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (searchDebounceTimer) {
                                        clearTimeout(searchDebounceTimer);
                                    }
                                    applyFilters(true);
                                }
                            }}
                        />
                    </div>
                    {#if hasActiveFilters}
                        <Button
                            type="button"
                            variant="outline"
                            onclick={clearFilters}
                            class="h-11 gap-2"
                        >
                            <X class="h-4 w-4" />
                            {m.clear()}
                        </Button>
                    {/if}
                </div>

                <!-- Filters Row -->
                <div class="grid grid-cols-1 gap-4">
                    <!-- Role Filter -->
                    <div class="space-y-2">
                        <Label for="filter-role" class="text-sm font-semibold">{m.role()}</Label>
                        <Select.Root
                            type="single"
                            value={selectedRoleId}
                            onValueChange={(value) => {
                                const newValue = value || "";
                                if (selectedRoleId !== newValue) {
                                    selectedRoleId = newValue;
                                    lastAppliedFilters.roleId = newValue;
                                    applyFilters();
                                }
                            }}
                        >
                            <Select.Trigger id="filter-role" class="h-11 w-full">
                                {selectedRoleId 
                                    ? data.roles.find((r: any) => r.id === selectedRoleId)?.displayName 
                                    : m.allRoles()}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">{m.allRoles()}</Select.Item>
                                {#each data.roles as role (role.id)}
                                    <Select.Item value={role.id}>
                                        {role.displayName}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>

                <!-- Active Filters Badge -->
                {#if hasActiveFilters}
                    <div class="flex items-center gap-2 pt-2 border-t">
                        <Filter class="h-4 w-4 text-muted-foreground" />
                        <span class="text-sm text-muted-foreground">{m.activeFilters()}</span>
                        <div class="flex flex-wrap gap-2">
                            {#if searchQuery}
                                <Badge variant="secondary" class="gap-1">
                                    {m.searchLabel()} {searchQuery}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            searchQuery = "";
                                            applyFilters();
                                        }}
                                        class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </Badge>
                            {/if}
                            {#if selectedRoleId}
                                <Badge variant="secondary" class="gap-1">
                                    {m.roleLabel()} {data.roles.find((r: any) => r.id === selectedRoleId)?.displayName}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            selectedRoleId = "";
                                            applyFilters();
                                        }}
                                        class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </Badge>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </Card.Content>
    </Card.Root>

    <!-- Sessions Table -->
    <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-6 px-6 pt-6">
            <div class="space-y-1">
                <Card.Title class="text-2xl">{m.sessions()}</Card.Title>
                <Card.Description class="text-base">
                    {data.total === 0 
                        ? m.noSessionsFound() 
                        : m.showingXToYOfZSessions({ 
                            start: ((data.currentPage - 1) * data.limit) + 1, 
                            end: Math.min(data.currentPage * data.limit, data.total), 
                            total: data.total
                        })}
                </Card.Description>
            </div>
            <Button
                variant="outline"
                size="sm"
                onclick={() => showColumnManager = true}
                class="gap-2 h-9"
            >
                <Columns class="h-4 w-4" />
                {m.manageColumns()}
            </Button>
        </Card.Header>
        <Card.Content class="p-0">
            <Table.Root>
                <Table.Header>
                    <Table.Row class="hover:bg-transparent">
                        {#each visibleColumns as col}
                            {#if col.id === 'user'}
                                <Table.Head class="w-[250px] px-6 py-4">
                                    <button
                                        type="button"
                                        onclick={() => handleSort('user')}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {col.label}
                                        {#if data.sortBy === 'user'}
                                            {#if data.sortOrder === 'asc'}
                                                <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                            {:else}
                                                <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                            {/if}
                                        {:else}
                                            <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                        {/if}
                                    </button>
                                </Table.Head>
                            {:else if col.id === 'role'}
                                <Table.Head class="px-6 py-4">{col.label}</Table.Head>
                            {:else if col.id === 'expires'}
                                <Table.Head class="px-6 py-4">
                                    <button
                                        type="button"
                                        onclick={() => handleSort('expires')}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {col.label}
                                        {#if data.sortBy === 'expires'}
                                            {#if data.sortOrder === 'asc'}
                                                <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                            {:else}
                                                <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                            {/if}
                                        {:else}
                                            <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                        {/if}
                                    </button>
                                </Table.Head>
                            {:else if col.id === 'sessionId'}
                                <Table.Head class="px-6 py-4">{col.label}</Table.Head>
                            {:else if col.id === 'actions'}
                                <Table.Head class="w-[80px] px-6 py-4"></Table.Head>
                            {/if}
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if data.sessions.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={visibleColumns.length} class="h-32 text-center">
                                <div class="flex flex-col items-center justify-center gap-2 py-8">
                                    <p class="text-muted-foreground text-base">
                                        {m.noSessionsFound()}
                                    </p>
                                    <p class="text-sm text-muted-foreground/70">
                                        {m.tryAdjustingFiltersGeneric()}
                                    </p>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data.sessions as session}
                            <Table.Row class="hover:bg-muted/50">
                                {#each visibleColumns as col}
                                    {#if col.id === 'user'}
                                        <Table.Cell class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <div
                                                    class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                                                >
                                                    <MonitorDot class="size-4" />
                                                </div>
                                                <div>
                                                    <p class="font-medium">
                                                        {session.user.firstName}
                                                        {session.user.lastName}
                                                    </p>
                                                    <p class="text-sm text-muted-foreground">
                                                        {session.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </Table.Cell>
                                    {:else if col.id === 'role'}
                                        <Table.Cell class="px-6 py-4">
                                            <Badge variant="secondary">
                                                {session.user.role.displayName}
                                            </Badge>
                                        </Table.Cell>
                                    {:else if col.id === 'expires'}
                                        <Table.Cell class="px-6 py-4 text-muted-foreground">
                                            {new Date(session.expires).toLocaleString()}
                                        </Table.Cell>
                                    {:else if col.id === 'sessionId'}
                                        <Table.Cell class="px-6 py-4 text-muted-foreground">
                                            {session.id.slice(0, 8)}…
                                        </Table.Cell>
                                    {:else if col.id === 'actions'}
                                        <Table.Cell class="px-6 py-4">
                                            {#if data.canManage}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onclick={() => openRevokeDialog(session.id)}
                                                >
                                                    <Trash2 class="h-4 w-4" />
                                                </Button>
                                            {/if}
                                        </Table.Cell>
                                    {/if}
                                {/each}
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </Card.Content>

        <!-- Pagination -->
        {#if data.pages > 1 || data.total > 0}
            <Card.Footer class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4">
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        Page <strong class="text-foreground">{data.currentPage}</strong> of <strong class="text-foreground">{data.pages}</strong>
                    </span>
                    <span class="text-muted-foreground">•</span>
                    <span>
                        {m.totalSessions({ count: Number(data.total) } as any)}
                    </span>
                </div>
                
                <div class="flex items-center gap-4">
                    <!-- Records Per Page -->
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-muted-foreground">{m.recordsPerPage()}</span>
                        <Select.Root
                            type="single"
                            value={selectedLimit.toString()}
                            onValueChange={(value) => {
                                if (value) handleLimitChange(parseInt(value));
                            }}
                        >
                            <Select.Trigger class="h-9 w-[100px]">
                                {selectedLimit}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="10">10</Select.Item>
                                <Select.Item value="25">25</Select.Item>
                                <Select.Item value="50">50</Select.Item>
                                <Select.Item value="100">100</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <!-- Pagination Controls -->
                    <div class="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={data.currentPage <= 1}
                            onclick={() => goToPage(data.currentPage - 1)}
                        >
                            <ChevronLeft class="h-4 w-4" />
                            {m.previous()}
                        </Button>
                        
                        {#each paginationPages as pageItem}
                            {#if pageItem === 'ellipsis'}
                                <span class="px-2 text-muted-foreground">...</span>
                            {:else}
                                <Button
                                    variant={pageItem === data.currentPage ? "default" : "outline"}
                                    size="sm"
                                    onclick={() => goToPage(pageItem)}
                                    class="min-w-[40px]"
                                >
                                    {pageItem}
                                </Button>
                            {/if}
                        {/each}
                        
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={data.currentPage >= data.pages}
                            onclick={() => goToPage(data.currentPage + 1)}
                        >
                            {m.next()}
                            <ChevronRight class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card.Footer>
        {/if}
    </Card.Root>
</div>

<!-- Revoke Session Dialog -->
<AlertDialog.Root bind:open={showRevokeDialog}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{m.revokeSessionTitle()}</AlertDialog.Title>
            <AlertDialog.Description>
                {m.revokeSessionDescription()}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel
                onclick={() => {
                    showRevokeDialog = false;
                    revokeSessionId = null;
                }}
            >
                {m.cancel()}
            </AlertDialog.Cancel>
            <form
                method="POST"
                action="?/revoke"
                use:enhance={() => {
                    isRevoking = true;
                    return async ({ update }) => {
                        await update();
                        isRevoking = false;
                    };
                }}
            >
                <input type="hidden" name="sessionId" value={revokeSessionId} />
                <Button type="submit" variant="destructive" disabled={isRevoking}>
                    {#if isRevoking}
                        <Spinner class="mr-2 h-4 w-4" />
                    {/if}
                    {m.revoke()}
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Column Management Dialog -->
<Dialog.Root bind:open={showColumnManager}>
    <Dialog.Content class="max-w-2xl">
        <Dialog.Header>
            <Dialog.Title>{m.manageColumns()}</Dialog.Title>
            <Dialog.Description>
                {m.manageColumnsDescription()}
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">
                    {m.dragToReorder()}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={resetColumns}
                >
                    {m.resetToDefault()}
                </Button>
            </div>
            
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
                {#each columns as column, index (column.id)}
                    <div
                        role="button"
                        tabindex="0"
                        class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-move"
                        draggable={true}
                        ondragstart={() => handleDragStart(column.id)}
                        ondragover={(e) => handleDragOver(column.id, e)}
                        ondragend={handleDragEnd}
                        data-column-id={column.id}
                    >
                        <GripVertical class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Checkbox
                            checked={column.visible}
                            onCheckedChange={() => toggleColumn(column.id)}
                            id={`col-${column.id}`}
                        />
                        <Label
                            for={`col-${column.id}`}
                            class="flex-1 cursor-pointer font-normal"
                        >
                            {column.label}
                        </Label>
                        {#if column.sortable}
                            <Badge variant="outline" class="text-xs">
                                {m.sortable()}
                            </Badge>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
        
        <Dialog.Footer>
            <Button onclick={() => showColumnManager = false}>
                {m.done()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
