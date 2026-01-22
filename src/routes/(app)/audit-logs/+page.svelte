<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as Select from "$lib/components/ui/select";
    import { Badge } from "$lib/components/ui/badge";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import * as Dialog from "$lib/components/ui/dialog";
    import Search from "@lucide/svelte/icons/search";
    import Download from "@lucide/svelte/icons/download";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import ChevronDown from "@lucide/svelte/icons/chevron-down";
    import ChevronUp from "@lucide/svelte/icons/chevron-up";
    import X from "@lucide/svelte/icons/x";
    import Filter from "@lucide/svelte/icons/filter";
    import Columns from "@lucide/svelte/icons/columns";
    import GripVertical from "@lucide/svelte/icons/grip-vertical";
    import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import { Spinner } from "$lib/components/ui/spinner";
    import { ColumnManager, type ColumnConfig } from "$lib/utils/column-manager";
    import * as m from "$lib/paraglide/messages.js";

    let { data } = $props() as any;

    let searchQuery = $state("");
    let selectedResource = $state("");
    let selectedAction = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let selectedLimit = $state(50);
    let isFiltering = $state(false);
    let expandedLogs = $state(new Set<string>());
    let showColumnManager = $state(false);
    let searchInputRef: HTMLInputElement | null = $state(null);

    // Column Management
    const columnManager = new ColumnManager({
        storageKey: 'audit-logs-table-columns',
        defaultColumns: [
            { id: 'expand', label: '', visible: true, order: 0, sortable: false },
            { id: 'action', label: m.action(), visible: true, order: 1, sortable: true },
            { id: 'resource', label: m.resource(), visible: true, order: 2, sortable: true },
            { id: 'user', label: m.user(), visible: true, order: 3, sortable: true },
            { id: 'resourceId', label: m.resourceId(), visible: true, order: 4, sortable: false },
            { id: 'timestamp', label: m.timestamp(), visible: true, order: 5, sortable: true }
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
            selectedResource = data.filters?.resource || "";
            selectedAction = data.filters?.action || "";
            startDate = data.filters?.startDate || "";
            endDate = data.filters?.endDate || "";
            selectedLimit = data.limit || 50;
            lastAppliedFilters = {
                search: searchQuery,
                resource: selectedResource,
                action: selectedAction,
                startDate,
                endDate
            };
            isInitialized = true;
        }
    });

    // Get unique options from all logs (for filter dropdowns)
    const resourceOptions = $derived(
        Array.from(new Set(data.logs.map((log: any) => log.resource as string))).sort() as string[]
    );
    const actionOptions = $derived(
        Array.from(new Set(data.logs.map((log: any) => log.action as string))).sort() as string[]
    );

    function toggleExpanded(logId: string) {
        const next = new Set(expandedLogs);
        if (next.has(logId)) {
            next.delete(logId);
        } else {
            next.add(logId);
        }
        expandedLogs = next;
    }

    // Auto-filter logic
    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAppliedFilters = $state({ search: "", resource: "", action: "", startDate: "", endDate: "" });

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
        const currentSortBy = data.sortBy || 'createdAt';
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

    function applyFilters(preserveFocus = false) {
        isFiltering = true;
        const url = new URL($page.url);
        url.searchParams.set("page", "1");
        
        if (searchQuery) url.searchParams.set("search", searchQuery);
        else url.searchParams.delete("search");

        if (selectedResource) url.searchParams.set("resource", selectedResource);
        else url.searchParams.delete("resource");

        if (selectedAction) url.searchParams.set("action", selectedAction);
        else url.searchParams.delete("action");

        if (startDate) url.searchParams.set("startDate", startDate);
        else url.searchParams.delete("startDate");

        if (endDate) url.searchParams.set("endDate", endDate);
        else url.searchParams.delete("endDate");

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
            isFiltering = false;
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
        selectedResource = "";
        selectedAction = "";
        startDate = "";
        endDate = "";
        applyFilters();
    }

    const hasActiveFilters = $derived(
        searchQuery !== "" || 
        selectedResource !== "" || 
        selectedAction !== "" ||
        startDate !== "" ||
        endDate !== ""
    );

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

    const currentPage = $derived(data.currentPage || 1);
    const paginationPages = $derived(getPaginationPages(currentPage, data.pages));

    // Export functions
    function buildExportUrl(format: 'csv' | 'json'): string {
        const params = new URLSearchParams();
        params.set('format', format);
        
        if (searchQuery) params.set('search', searchQuery);
        if (selectedResource) params.set('resource', selectedResource);
        if (selectedAction) params.set('action', selectedAction);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        
        return `/audit-logs/export?${params.toString()}`;
    }

    async function handleExportCSV() {
        const url = buildExportUrl('csv');
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } else {
            console.error('Failed to export CSV:', response.statusText);
        }
    }

    async function handleExportJSON() {
        const url = buildExportUrl('json');
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } else {
            console.error('Failed to export JSON:', response.statusText);
        }
    }
</script>

<svelte:head>
    <title>{m.auditLogs()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">{m.auditLogs()}</h1>
            <p class="text-muted-foreground">{m.auditLogsSubtitle()}</p>
        </div>
        <div class="flex gap-2">
            <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onclick={handleExportCSV}
            >
                <Download class="mr-2 h-4 w-4" />
                {m.exportCSV()}
            </Button>
            <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onclick={handleExportJSON}
            >
                <Download class="mr-2 h-4 w-4" />
                {m.exportJSON()}
            </Button>
        </div>
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
                            placeholder={m.searchAuditLogs()}
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <!-- Resource Filter -->
                    <div class="space-y-2">
                        <Label for="filter-resource" class="text-sm font-semibold">{m.resource()}</Label>
                        <Select.Root
                            type="single"
                            value={selectedResource}
                            onValueChange={(value) => {
                                const newValue = value || "";
                                if (selectedResource !== newValue) {
                                    selectedResource = newValue;
                                    lastAppliedFilters.resource = newValue;
                                    applyFilters();
                                }
                            }}
                        >
                            <Select.Trigger id="filter-resource" class="h-11 w-full">
                                {selectedResource || m.allResources()}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">{m.allResources()}</Select.Item>
                                {#each resourceOptions as resource}
                                    <Select.Item value={resource}>{resource}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <!-- Action Filter -->
                    <div class="space-y-2">
                        <Label for="filter-action" class="text-sm font-semibold">{m.action()}</Label>
                        <Select.Root
                            type="single"
                            value={selectedAction}
                            onValueChange={(value) => {
                                const newValue = value || "";
                                if (selectedAction !== newValue) {
                                    selectedAction = newValue;
                                    lastAppliedFilters.action = newValue;
                                    applyFilters();
                                }
                            }}
                        >
                            <Select.Trigger id="filter-action" class="h-11 w-full">
                                {selectedAction || m.allActions()}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">{m.allActions()}</Select.Item>
                                {#each actionOptions as action}
                                    <Select.Item value={action}>{action}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <!-- Start Date -->
                    <div class="space-y-2">
                        <Label for="filter-start-date" class="text-sm font-semibold">{m.startDate()}</Label>
                        <Input
                            id="filter-start-date"
                            type="date"
                            bind:value={startDate}
                            class="h-11"
                            onchange={() => {
                                lastAppliedFilters.startDate = startDate;
                                applyFilters();
                            }}
                        />
                    </div>

                    <!-- End Date -->
                    <div class="space-y-2">
                        <Label for="filter-end-date" class="text-sm font-semibold">{m.endDate()}</Label>
                        <Input
                            id="filter-end-date"
                            type="date"
                            bind:value={endDate}
                            class="h-11"
                            onchange={() => {
                                lastAppliedFilters.endDate = endDate;
                                applyFilters();
                            }}
                        />
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
                            {#if selectedResource}
                                <Badge variant="secondary" class="gap-1">
                                    {m.resource()}: {selectedResource}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            selectedResource = "";
                                            applyFilters();
                                        }}
                                        class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </Badge>
                            {/if}
                            {#if selectedAction}
                                <Badge variant="secondary" class="gap-1">
                                    {m.action()}: {selectedAction}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            selectedAction = "";
                                            applyFilters();
                                        }}
                                        class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </Badge>
                            {/if}
                            {#if startDate}
                                <Badge variant="secondary" class="gap-1">
                                    From: {startDate}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            startDate = "";
                                            applyFilters();
                                        }}
                                        class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </Badge>
                            {/if}
                            {#if endDate}
                                <Badge variant="secondary" class="gap-1">
                                    {m.to()} {endDate}
                                    <button
                                        type="button"
                                        onclick={() => {
                                            endDate = "";
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

    <!-- Audit Logs Table -->
    <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-6 px-6 pt-6">
            <div class="space-y-1">
                <Card.Title class="text-2xl">{m.auditLogs()}</Card.Title>
                <Card.Description class="text-base">
                    {data.total === 0 
                        ? "No audit logs found" 
                        : `Showing ${((data.currentPage || data.page - 1) * data.limit) + 1} to ${Math.min((data.currentPage || data.page) * data.limit, data.total)} of ${data.total} logs`}
                </Card.Description>
            </div>
            <Button
                variant="outline"
                size="sm"
                onclick={() => showColumnManager = true}
                class="gap-2 h-9"
            >
                <Columns class="h-4 w-4" />
                Manage Columns
            </Button>
        </Card.Header>
        <Card.Content class="p-0">
            <Table.Root>
                <Table.Header>
                    <Table.Row class="hover:bg-transparent">
                        {#each visibleColumns as col}
                            {#if col.id === 'expand'}
                                <Table.Head class="w-[50px] px-6 py-4"></Table.Head>
                            {:else if col.id === 'action'}
                                <Table.Head class="px-6 py-4">
                                    <button
                                        type="button"
                                        onclick={() => handleSort('action')}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {col.label}
                                        {#if data.sortBy === 'action'}
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
                            {:else if col.id === 'resource'}
                                <Table.Head class="px-6 py-4">
                                    <button
                                        type="button"
                                        onclick={() => handleSort('resource')}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {col.label}
                                        {#if data.sortBy === 'resource'}
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
                            {:else if col.id === 'user'}
                                <Table.Head class="px-6 py-4">
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
                            {:else if col.id === 'resourceId'}
                                <Table.Head class="px-6 py-4">{col.label}</Table.Head>
                            {:else if col.id === 'timestamp'}
                                <Table.Head class="px-6 py-4">
                                    <button
                                        type="button"
                                        onclick={() => handleSort('createdAt')}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {col.label}
                                        {#if data.sortBy === 'createdAt'}
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
                            {/if}
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if data.logs.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={visibleColumns.length} class="h-32 text-center">
                                <div class="flex flex-col items-center justify-center gap-2 py-8">
                                    <p class="text-muted-foreground text-base">
                                        {m.noAuditLogsFound()}
                                    </p>
                                    <p class="text-sm text-muted-foreground/70">
                                        {m.tryAdjustingFiltersGeneric()}
                                    </p>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data.logs as log}
                            <Table.Row class="hover:bg-muted/50">
                                {#each visibleColumns as col}
                                    {#if col.id === 'expand'}
                                        <Table.Cell class="px-6 py-4">
                                            {#if log.metadata || log.ipAddress || log.userAgent}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onclick={() => toggleExpanded(log.id)}
                                                >
                                                    {#if expandedLogs.has(log.id)}
                                                        <ChevronUp class="h-4 w-4" />
                                                    {:else}
                                                        <ChevronDown class="h-4 w-4" />
                                                    {/if}
                                                </Button>
                                            {/if}
                                        </Table.Cell>
                                    {:else if col.id === 'action'}
                                        <Table.Cell class="px-6 py-4">
                                            <Badge variant="secondary">{log.action}</Badge>
                                        </Table.Cell>
                                    {:else if col.id === 'resource'}
                                        <Table.Cell class="px-6 py-4">{log.resource}</Table.Cell>
                                    {:else if col.id === 'user'}
                                        <Table.Cell class="px-6 py-4">
                                            {#if log.user}
                                                {log.user.firstName} {log.user.lastName}
                                                <div class="text-xs text-muted-foreground">
                                                    {log.user.email}
                                                </div>
                                            {:else}
                                                <span class="text-muted-foreground">—</span>
                                            {/if}
                                        </Table.Cell>
                                    {:else if col.id === 'resourceId'}
                                        <Table.Cell class="px-6 py-4 text-muted-foreground">
                                            {log.resourceId || "—"}
                                        </Table.Cell>
                                    {:else if col.id === 'timestamp'}
                                        <Table.Cell class="px-6 py-4 text-muted-foreground">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </Table.Cell>
                                    {/if}
                                {/each}
                            </Table.Row>
                            {#if expandedLogs.has(log.id)}
                                <Table.Row>
                                    <Table.Cell colspan={visibleColumns.length} class="bg-muted/50">
                                        <div class="space-y-2 p-4 text-sm">
                                            {#if log.metadata}
                                                <div>
                                                    <strong>{m.metadata()}</strong>
                                                    <pre class="mt-1 rounded bg-background p-2 text-xs overflow-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                                                </div>
                                            {/if}
                                            {#if log.ipAddress}
                                                <div>
                                                    <strong>{m.ipAddress()}</strong> {log.ipAddress}
                                                </div>
                                            {/if}
                                            {#if log.userAgent}
                                                <div>
                                                    <strong>{m.userAgent()}</strong> {log.userAgent}
                                                </div>
                                            {/if}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/if}
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
                        Page <strong class="text-foreground">{currentPage}</strong> of <strong class="text-foreground">{data.pages}</strong>
                    </span>
                    <span class="text-muted-foreground">•</span>
                    <span>
                        {m.totalLogs({ count: Number(data.total) } as any)}
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
                                <Select.Item value="25">25</Select.Item>
                                <Select.Item value="50">50</Select.Item>
                                <Select.Item value="100">100</Select.Item>
                                <Select.Item value="200">200</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <!-- Pagination Controls -->
                    <div class="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onclick={() => goToPage(currentPage - 1)}
                        >
                            <ChevronLeft class="h-4 w-4" />
                            {m.previous()}
                        </Button>
                        
                        {#each paginationPages as pageItem}
                            {#if pageItem === 'ellipsis'}
                                <span class="px-2 text-muted-foreground">...</span>
                            {:else}
                                <Button
                                    variant={pageItem === currentPage ? "default" : "outline"}
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
                            disabled={currentPage >= data.pages}
                            onclick={() => goToPage(currentPage + 1)}
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
