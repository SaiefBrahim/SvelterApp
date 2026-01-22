<script lang="ts">
    import { untrack } from "svelte";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as Select from "$lib/components/ui/select";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Label } from "$lib/components/ui/label";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import Columns from "@lucide/svelte/icons/columns";
    import GripVertical from "@lucide/svelte/icons/grip-vertical";
    import Search from "@lucide/svelte/icons/search";
    import X from "@lucide/svelte/icons/x";
    import Filter from "@lucide/svelte/icons/filter";
    import { ColumnManager, type ColumnConfig } from "$lib/utils/column-manager";
    import * as m from "$lib/paraglide/messages.js";

    export interface DataTableColumn<T = any> {
        id: string;
        label: string;
        accessorKey?: keyof T;
        sortable?: boolean;
        headerClass?: string;
        cellClass?: string;
        width?: string;
    }

    export interface DataTableFilter {
        id: string;
        type: 'text' | 'select';
        label: string;
        placeholder?: string;
        options?: Array<{ value: string; label: string }>;
        minLength?: number; // For text filters, minimum chars before auto-trigger
    }

    export interface DataTableProps<T = any> {
        title: string;
        description?: string;
        data: T[];
        columns: DataTableColumn<T>[];
        filters?: DataTableFilter[];
        // Pagination
        currentPage: number;
        totalPages: number;
        total: number;
        limit: number;
        // Sorting
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        // Column management
        storageKey: string;
        defaultColumns: ColumnConfig[];
        // Callbacks
        onPageChange: (page: number) => void;
        onLimitChange: (limit: number) => void;
        onSort: (column: string) => void;
        onFilterChange: (filters: Record<string, string>) => void;
        // Filter values
        filterValues?: Record<string, string>;
        // Empty state
        emptyMessage?: string;
        emptyDescription?: string;
    }

    let {
        title,
        description,
        data,
        columns: propColumns,
        filters = [],
        currentPage,
        totalPages,
        total,
        limit,
        sortBy,
        sortOrder,
        storageKey,
        defaultColumns,
        onPageChange,
        onLimitChange,
        onSort,
        onFilterChange,
        filterValues = {},
        emptyMessage = "No results found",
        emptyDescription = "Try adjusting your filters",
        cellRenderers
    }: DataTableProps & { cellRenderers?: Record<string, import('svelte').Snippet<[any]>> } = $props();

    // Column Management - use untrack to capture initial values
    const columnManager = new ColumnManager({
        storageKey: untrack(() => storageKey),
        defaultColumns: untrack(() => defaultColumns)
    });

    let tableColumns = $state<ColumnConfig[]>(columnManager.loadColumns());
    let showColumnManager = $state(false);
    let draggedColumnId: string | null = $state(null);

    // Filter state - use untrack to capture initial values
    const initialFilterValues = untrack(() => filterValues);
    let filterState = $state<Record<string, string>>({ ...initialFilterValues });
    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Get visible columns in order
    const visibleColumns = $derived(columnManager.getVisibleColumns(tableColumns));

    // Filter visible columns to match prop columns
    const activeColumns = $derived(
        visibleColumns
            .map(col => propColumns.find(pc => pc.id === col.id))
            .filter(Boolean) as DataTableColumn[]
    );

    // Filter types
    const textFilters = $derived(filters.filter(f => f.type === 'text'));
    const selectFilters = $derived(filters.filter(f => f.type === 'select'));

    // Column management functions
    function toggleColumn(columnId: string) {
        tableColumns = columnManager.toggleColumn(tableColumns, columnId);
    }

    function handleDragStart(columnId: string) {
        draggedColumnId = columnId;
    }

    function handleDragOver(columnId: string, event: DragEvent) {
        event.preventDefault();
        if (draggedColumnId && draggedColumnId !== columnId) {
            const fromIndex = tableColumns.findIndex(col => col.id === draggedColumnId);
            const toIndex = tableColumns.findIndex(col => col.id === columnId);
            if (fromIndex !== -1 && toIndex !== -1) {
                tableColumns = columnManager.reorderColumns(tableColumns, fromIndex, toIndex);
            }
        }
    }

    function handleDragEnd() {
        draggedColumnId = null;
    }

    function resetColumns() {
        tableColumns = columnManager.resetColumns();
    }

    // Filter functions
    function handleFilterChange(filterId: string, value: string) {
        const filter = filters.find(f => f.id === filterId);
        
        // For text filters, check minLength
        if (filter?.type === 'text' && filter.minLength) {
            // Clear existing timer
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            
            // Only trigger if length === 0 or length >= minLength
            if (value.length === 0 || value.length >= filter.minLength) {
                // Small delay for better UX
                searchDebounceTimer = setTimeout(() => {
                    onFilterChange({ ...filterState });
                }, 300);
            }
        } else {
            // For select filters, trigger immediately
            onFilterChange({ ...filterState });
        }
    }

    function handleSearchKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            onFilterChange({ ...filterState });
        }
    }

    // Cleanup timer on unmount
    $effect(() => {
        return () => {
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
        };
    });

    function clearFilters() {
        filterState = {};
        onFilterChange({});
    }

    const hasActiveFilters = $derived(
        Object.values(filterState).some(v => v !== "" && v !== undefined)
    );

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

    const paginationPages = $derived(getPaginationPages(currentPage, totalPages));

    // Get column by ID
    function getColumn(columnId: string): DataTableColumn | undefined {
        return propColumns.find(col => col.id === columnId);
    }

    // Check if column is visible
    function isColumnVisible(columnId: string): boolean {
        return visibleColumns.some(col => col.id === columnId);
    }
</script>

<div class="space-y-6">
    <!-- Filters -->
    {#if filters.length > 0}
        <Card.Root>
            <Card.Content class="p-6">
                <div class="space-y-4">
                    <!-- Text Filters Row -->
                    {#if textFilters.length > 0}
                        <div class="flex gap-3">
                            {#each textFilters as filter}
                                <div class="relative flex-1">
                                    <Search
                                        class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                                    />
                                    {#key filter.id}
                                        {@const inputValue = filterState[filter.id] || ""}
                                        <Input
                                            type="search"
                                            placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                                            class="pl-12 h-11 text-base"
                                            value={inputValue}
                                            oninput={(e) => {
                                                const newValue = e.currentTarget.value;
                                                // Update state with new object reference to trigger reactivity
                                                filterState = { ...filterState, [filter.id]: newValue };
                                                // Handle filter change
                                                handleFilterChange(filter.id, newValue);
                                            }}
                                            onkeydown={handleSearchKeydown}
                                        />
                                    {/key}
                                </div>
                            {/each}
                            {#if hasActiveFilters}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onclick={clearFilters}
                                    class="h-11 gap-2"
                                >
                                    <X class="h-4 w-4" />
                                    Clear
                                </Button>
                            {/if}
                        </div>
                    {/if}

                    <!-- Select Filters Row -->
                    {#if selectFilters.length > 0}
                        <div class="grid grid-cols-2 gap-4">
                            {#each selectFilters as filter}
                                <div class="space-y-2">
                                    <Label for={`filter-${filter.id}`} class="text-sm font-semibold">{filter.label}</Label>
                                    <Select.Root
                                        type="single"
                                        value={filterState[filter.id] || ""}
                                        onValueChange={(value) => handleFilterChange(filter.id, value || "")}
                                    >
                                        <Select.Trigger id={`filter-${filter.id}`} class="h-11 w-full">
                                            {filterState[filter.id] 
                                                ? filter.options?.find(opt => opt.value === filterState[filter.id])?.label
                                                : `All ${filter.label}`}
                                        </Select.Trigger>
                                        <Select.Content>
                                            <Select.Item value="">All {filter.label}</Select.Item>
                                            {#each filter.options || [] as option}
                                                <Select.Item value={option.value}>
                                                    {option.label}
                                                </Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Active Filters Badge -->
                    {#if hasActiveFilters}
                        <div class="flex items-center gap-2 pt-2 border-t">
                            <Filter class="h-4 w-4 text-muted-foreground" />
                            <span class="text-sm text-muted-foreground">Active filters:</span>
                            <div class="flex flex-wrap gap-2">
                                {#each Object.entries(filterState) as [filterId, value]}
                                    {#if value}
                                        {@const filter = filters.find(f => f.id === filterId)}
                                        <Badge variant="secondary" class="gap-1">
                                            {filter?.label}: {filter?.type === 'select' 
                                                ? filter.options?.find(opt => opt.value === value)?.label || value
                                                : value}
                                            <button
                                                type="button"
                                                onclick={() => {
                                                    filterState[filterId] = "";
                                                    onFilterChange({ ...filterState });
                                                }}
                                                class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                            >
                                                <X class="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- Table -->
    <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-6 px-6 pt-6">
            <div class="space-y-1">
                <Card.Title class="text-2xl">{title}</Card.Title>
                {#if description}
                    <Card.Description class="text-base">
                        {total === 0 
                            ? emptyMessage
                            : `Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, total)} of ${total} results`}
                    </Card.Description>
                {/if}
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
                        {#each activeColumns as column}
                            <Table.Head class={column.headerClass || "px-6 py-4"} style={column.width ? `width: ${column.width}` : undefined}>
                                {#if column.sortable}
                                    <button
                                        type="button"
                                        onclick={() => onSort(column.id)}
                                        class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                    >
                                        {column.label}
                                        {#if sortBy === column.id}
                                            {#if sortOrder === 'asc'}
                                                <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                            {:else}
                                                <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                            {/if}
                                        {:else}
                                            <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                        {/if}
                                    </button>
                                {:else}
                                    {column.label}
                                {/if}
                            </Table.Head>
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if data.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={activeColumns.length} class="h-32 text-center">
                                <div class="flex flex-col items-center justify-center gap-2 py-8">
                                    <p class="text-muted-foreground text-base">
                                        {emptyMessage}
                                    </p>
                                    <p class="text-sm text-muted-foreground/70">
                                        {emptyDescription}
                                    </p>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data as row}
                            <Table.Row class="hover:bg-muted/50">
                                {#each activeColumns as column}
                                    <Table.Cell class={column.cellClass || "px-6 py-4"}>
                                        {#if cellRenderers?.[column.id]}
                                            {@render cellRenderers[column.id](row)}
                                        {:else if column.accessorKey}
                                            {String(row[column.accessorKey] || '')}
                                        {/if}
                                    </Table.Cell>
                                {/each}
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </Card.Content>

        <!-- Pagination -->
        {#if totalPages > 1 || total > 0}
            <Card.Footer class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4">
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        Page <strong class="text-foreground">{currentPage}</strong> of <strong class="text-foreground">{totalPages}</strong>
                    </span>
                    <span class="text-muted-foreground">•</span>
                    <span>
                        <strong class="text-foreground">{total}</strong> total {total === 1 ? 'result' : 'results'}
                    </span>
                </div>
                
                <div class="flex items-center gap-4">
                    <!-- Records Per Page -->
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-muted-foreground">Records per page:</span>
                        <Select.Root
                            type="single"
                            value={limit.toString()}
                            onValueChange={(value) => {
                                if (value) onLimitChange(parseInt(value));
                            }}
                        >
                            <Select.Trigger class="h-9 w-[100px]">
                                {limit}
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
                            disabled={currentPage <= 1}
                            onclick={() => onPageChange(currentPage - 1)}
                        >
                            <ChevronLeft class="h-4 w-4" />
                            Previous
                        </Button>
                        
                        <!-- Smart Page Numbers with Ellipsis -->
                        {#each paginationPages as pageItem}
                            {#if pageItem === 'ellipsis'}
                                <span class="px-2 text-muted-foreground">...</span>
                            {:else}
                                <Button
                                    variant={pageItem === currentPage ? "default" : "outline"}
                                    size="sm"
                                    onclick={() => onPageChange(pageItem)}
                                    class="min-w-[40px]"
                                >
                                    {pageItem}
                                </Button>
                            {/if}
                        {/each}
                        
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onclick={() => onPageChange(currentPage + 1)}
                        >
                            Next
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
            <Dialog.Title>Manage Columns</Dialog.Title>
            <Dialog.Description>
                Show, hide, and reorder columns. Changes are saved automatically.
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">
                    Drag to reorder, check/uncheck to show/hide
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={resetColumns}
                >
                    Reset to Default
                </Button>
            </div>
            
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
                {#each tableColumns as column, index (column.id)}
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
                Done
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
