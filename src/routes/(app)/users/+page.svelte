<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto, invalidate } from "$app/navigation";
    import { page } from "$app/stores";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import { Spinner } from "$lib/components/ui/spinner";
    import Plus from "@lucide/svelte/icons/plus";
    import Search from "@lucide/svelte/icons/search";
    import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
    import Pencil from "@lucide/svelte/icons/pencil";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import UserCheck from "@lucide/svelte/icons/user-check";
    import UserX from "@lucide/svelte/icons/user-x";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import MailPlus from "@lucide/svelte/icons/mail-plus";
    import RotateCw from "@lucide/svelte/icons/rotate-cw";
    import Copy from "@lucide/svelte/icons/copy";
    import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import Filter from "@lucide/svelte/icons/filter";
    import X from "@lucide/svelte/icons/x";
    import Columns from "@lucide/svelte/icons/columns";
    import GripVertical from "@lucide/svelte/icons/grip-vertical";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { toast } from "svelte-sonner";
    import { i18n } from "$lib/i18n";
    import { ColumnManager, type ColumnConfig } from "$lib/utils/column-manager";
    import * as m from "$lib/paraglide/messages.js";

    let { data, form } = $props() as any;

    let activeTab = $state("");
    let searchQuery = $state("");
    let inviteSearchQuery = $state("");
    let isSearching = $state(false);
    let deleteUserId = $state<string | null>(null);
    let isDeleting = $state(false);
    let showDeleteDialog = $state(false);
    let selectedRoleId = $state("");
    let selectedInviteRoleId = $state("");
    let selectedStatus = $state<string>("all");
    let selectedLimit = $state(10);
    let cancelInviteId = $state<string | null>(null);
    let showCancelInviteDialog = $state(false);
    let isCancelling = $state(false);
    let resendingInviteId = $state<string | null>(null);
    let showColumnManager = $state(false);
    let togglingActiveUserId = $state<string | null>(null);
    let isCreatingInvite = $state(false);
    
    // Invite-specific state
    let selectedInviteStatus = $state<string>("all");
    let selectedInviteRoleFilter = $state("");
    let selectedInviteLimit = $state(10);
    let showInviteColumnManager = $state(false);
    let inviteSearchInputRef: HTMLInputElement | null = $state(null);
    
    // Reference to search input to preserve focus
    let searchInputRef: HTMLInputElement | null = $state(null);

    // Column Management for Users
    const columnManager = new ColumnManager({
        storageKey: 'users-table-columns',
        defaultColumns: [
            { id: 'user', label: m.user(), visible: true, order: 0, sortable: true },
            { id: 'role', label: m.role(), visible: true, order: 1, sortable: true },
            { id: 'status', label: m.status(), visible: true, order: 2, sortable: true },
            { id: 'lastLogin', label: m.lastLogin(), visible: true, order: 3, sortable: true },
            { id: 'actions', label: m.actions(), visible: true, order: 4, sortable: false }
        ]
    });

    let columns = $state<ColumnConfig[]>(columnManager.loadColumns());
    let draggedColumnId: string | null = $state(null);

    // Get visible columns in order
    const visibleColumns = $derived(columnManager.getVisibleColumns(columns));

    // Column Management for Invites
    const inviteColumnManager = new ColumnManager({
        storageKey: 'invites-table-columns',
        defaultColumns: [
            { id: 'email', label: m.email(), visible: true, order: 0, sortable: true },
            { id: 'role', label: m.role(), visible: true, order: 1, sortable: true },
            { id: 'status', label: m.status(), visible: true, order: 2, sortable: true },
            { id: 'expires', label: m.expires(), visible: true, order: 3, sortable: true },
            { id: 'actions', label: m.actions(), visible: true, order: 4, sortable: false }
        ]
    });

    let inviteColumns = $state<ColumnConfig[]>(inviteColumnManager.loadColumns());
    let draggedInviteColumnId: string | null = $state(null);

    const visibleInviteColumns = $derived(inviteColumnManager.getVisibleColumns(inviteColumns));

    // Column management functions
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

    // Helper to check if column is visible
    function isColumnVisible(columnId: string): boolean {
        return visibleColumns.some(col => col.id === columnId);
    }

    // Get column order
    function getColumnOrder(columnId: string): number {
        const col = visibleColumns.find(c => c.id === columnId);
        return col?.order ?? 999;
    }

    // Handle tab change
    function handleTabChange(tab: string) {
        activeTab = tab;
        const url = new URL($page.url);
        url.searchParams.set("tab", tab);
        if (tab === "users") {
            url.searchParams.delete("inviteSearch");
            url.searchParams.delete("status");
        }
        goto(url.toString(), { invalidateAll: true });
    }

    // Handle search
    function handleSearch() {
        isSearching = true;
        const url = new URL($page.url);
        if (searchQuery) {
            url.searchParams.set("search", searchQuery);
        } else {
            url.searchParams.delete("search");
        }
        url.searchParams.set("page", "1");
        goto(url.toString(), { invalidateAll: true }).finally(() => {
            isSearching = false;
        });
    }

    // Invite column management functions
    function toggleInviteColumn(columnId: string) {
        inviteColumns = inviteColumnManager.toggleColumn(inviteColumns, columnId);
    }

    function handleInviteDragStart(columnId: string) {
        draggedInviteColumnId = columnId;
    }

    function handleInviteDragOver(columnId: string, event: DragEvent) {
        event.preventDefault();
        if (draggedInviteColumnId && draggedInviteColumnId !== columnId) {
            const fromIndex = inviteColumns.findIndex(col => col.id === draggedInviteColumnId);
            const toIndex = inviteColumns.findIndex(col => col.id === columnId);
            if (fromIndex !== -1 && toIndex !== -1) {
                inviteColumns = inviteColumnManager.reorderColumns(inviteColumns, fromIndex, toIndex);
            }
        }
    }

    function handleInviteDragEnd() {
        draggedInviteColumnId = null;
    }

    function resetInviteColumns() {
        inviteColumns = inviteColumnManager.resetColumns();
    }

    // Handle invite sorting
    function handleInviteSort(column: string) {
        const url = new URL($page.url);
        const currentSortBy = data.inviteSortBy || 'createdAt';
        const currentSortOrder = data.inviteSortOrder || 'desc';
        
        if (currentSortBy === column) {
            url.searchParams.set('inviteSortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            url.searchParams.set('inviteSortBy', column);
            url.searchParams.set('inviteSortOrder', 'asc');
        }
        url.searchParams.set('invitePage', '1');
        goto(url.toString(), { invalidateAll: true });
    }

    // Handle invite filter changes
    function applyInviteFilters(preserveFocus = false) {
        const url = new URL($page.url);
        url.searchParams.set('invitePage', '1');
        
        if (inviteSearchQuery) {
            url.searchParams.set('inviteSearch', inviteSearchQuery);
        } else {
            url.searchParams.delete('inviteSearch');
        }
        
        if (selectedInviteRoleFilter) {
            url.searchParams.set('inviteRoleId', selectedInviteRoleFilter);
        } else {
            url.searchParams.delete('inviteRoleId');
        }
        
        if (selectedInviteStatus === 'pending') {
            url.searchParams.set('inviteStatus', 'PENDING');
        } else if (selectedInviteStatus === 'accepted') {
            url.searchParams.set('inviteStatus', 'ACCEPTED');
        } else if (selectedInviteStatus === 'canceled') {
            url.searchParams.set('inviteStatus', 'CANCELED');
        } else if (selectedInviteStatus === 'expired') {
            url.searchParams.set('inviteStatus', 'EXPIRED');
        } else {
            url.searchParams.delete('inviteStatus');
        }
        
        let cursorPos: number | null = null;
        if (preserveFocus && inviteSearchInputRef) {
            const input = inviteSearchInputRef as HTMLInputElement;
            if (document.activeElement === input) {
                cursorPos = input.selectionStart;
            }
        }
        
        goto(url.toString(), { 
            invalidateAll: true,
            replaceState: true,
            noScroll: true
        }).then(() => {
            if (cursorPos !== null && inviteSearchInputRef) {
                const input = inviteSearchInputRef as HTMLInputElement;
                setTimeout(() => {
                    input.focus({ preventScroll: true });
                    if (cursorPos <= input.value.length) {
                        input.setSelectionRange(cursorPos, cursorPos);
                    }
                }, 0);
            }
        });
    }

    // Handle invite limit change
    function handleInviteLimitChange(limit: number) {
        const url = new URL($page.url);
        url.searchParams.set('inviteLimit', limit.toString());
        url.searchParams.set('invitePage', '1');
        goto(url.toString(), { invalidateAll: true });
    }

    // Clear all invite filters
    function clearInviteFilters() {
        inviteSearchQuery = "";
        selectedInviteRoleFilter = "";
        selectedInviteStatus = "all";
        applyInviteFilters();
    }

    const hasActiveInviteFilters = $derived(
        inviteSearchQuery !== "" || 
        selectedInviteRoleFilter !== "" || 
        selectedInviteStatus !== "all"
    );

    // Handle invite pagination
    function goToInvitePage(pageNum: number) {
        const url = new URL($page.url);
        url.searchParams.set("invitePage", pageNum.toString());
        goto(url.toString(), { invalidateAll: true });
    }

    // Smart pagination for invites
    function getInvitePaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
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

    const invitePaginationPages = $derived(getInvitePaginationPages(data.inviteCurrentPage || 1, data.invitePages || 1));

    // Auto-filter logic for invites
    let inviteSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAppliedInviteFilters = $state({ search: "", roleId: "", status: "all" });

    $effect(() => {
        if (!isInitialized || activeTab !== 'invites') return;
        if (inviteSearchQuery === lastAppliedInviteFilters.search) return;
        
        if (inviteSearchDebounceTimer) {
            clearTimeout(inviteSearchDebounceTimer);
        }
        
        if (inviteSearchQuery.length === 0 || inviteSearchQuery.length >= 3) {
            inviteSearchDebounceTimer = setTimeout(() => {
                if (inviteSearchQuery !== lastAppliedInviteFilters.search) {
                    lastAppliedInviteFilters.search = inviteSearchQuery;
                    applyInviteFilters(true);
                }
            }, 300);
        }
        
        return () => {
            if (inviteSearchDebounceTimer) {
                clearTimeout(inviteSearchDebounceTimer);
            }
        };
    });

    // Handle pagination
    function goToPage(pageNum: number) {
        const url = new URL($page.url);
        url.searchParams.set("page", pageNum.toString());
        goto(url.toString(), { invalidateAll: true });
    }

    // Invite helpers
    function formatDateTime(date: Date) {
        return new Date(date).toLocaleString();
    }

    function isExpiringSoon(expiresAt: Date): boolean {
        const daysUntilExpiry = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 1 && daysUntilExpiry > 0;
    }

    function isExpired(expiresAt: Date): boolean {
        return new Date(expiresAt) < new Date();
    }

    function statusBadge(status: string) {
        switch (status) {
            case "ACCEPTED":
                return "bg-emerald-500/10 text-emerald-500";
            case "CANCELED":
                return "bg-destructive/10 text-destructive";
            case "EXPIRED":
                return "bg-muted text-muted-foreground";
            default:
                return "bg-primary/10 text-primary";
        }
    }

    function copyInviteLink(token: string) {
        const url = new URL(`/invites/accept/${token}`, $page.url.origin);
        navigator.clipboard.writeText(url.toString());
        toast.success(m.inviteLinkCopied());
    }

    function openCancelInviteDialog(inviteId: string) {
        cancelInviteId = inviteId;
        showCancelInviteDialog = true;
    }

    // Format date
    function formatDate(date: Date | null) {
        if (!date) return "Never";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    // Get role badge variant
    function getRoleBadgeVariant(
        roleName: string,
    ): "default" | "secondary" | "outline" {
        switch (roleName) {
            case "ADMIN":
                return "default";
            case "MANAGER":
                return "secondary";
            default:
                return "outline";
        }
    }

    // Open delete dialog
    function openDeleteDialog(userId: string) {
        deleteUserId = userId;
        showDeleteDialog = true;
    }

    $effect(() => {
        if (form?.success) {
            toast.success(m.actionCompleted());
            deleteUserId = null;
            showDeleteDialog = false;
            cancelInviteId = null;
            showCancelInviteDialog = false;
            resendingInviteId = null;
        }
    });

    // Initialize from data - only run once on mount
    let isInitialized = $state(false);
    $effect(() => {
        if (!isInitialized) {
            activeTab = data.tab || "users";
            selectedRoleId = data.filters?.roleId || "";
            selectedInviteRoleId = data.roles[0]?.id ?? "";
            searchQuery = data.filters?.search || "";
            selectedStatus = data.filters?.isActive === undefined ? "all" : data.filters.isActive ? "active" : "inactive";
            selectedLimit = data.limit || 10;
            
            // Initialize invite filters
            inviteSearchQuery = data.inviteFilters?.search || "";
            selectedInviteRoleFilter = data.inviteFilters?.roleId || "";
            const inviteStatus = data.inviteFilters?.status;
            selectedInviteStatus = inviteStatus ? inviteStatus.toLowerCase() : "all";
            selectedInviteLimit = data.inviteLimit || 10;
            
            // Update last applied filters to prevent auto-trigger on init
            lastAppliedFilters = {
                roleId: selectedRoleId,
                status: selectedStatus,
                search: searchQuery
            };
            lastAppliedInviteFilters = {
                search: inviteSearchQuery,
                roleId: selectedInviteRoleFilter,
                status: selectedInviteStatus
            };
            isInitialized = true;
        }
    });

    // Auto-filter logic
    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAppliedFilters = $state({ roleId: "", status: "all", search: "" });

    // Auto-filter search after 3 characters - watch searchQuery changes
    $effect(() => {
        // Skip if not initialized yet
        if (!isInitialized) return;
        
        // Skip if this matches the last applied filter (to avoid infinite loops)
        if (searchQuery === lastAppliedFilters.search) return;
        
        // Clear any existing timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        // Only auto-trigger if length === 0 or length >= 3
        if (searchQuery.length === 0 || searchQuery.length >= 3) {
            searchDebounceTimer = setTimeout(() => {
                // Double-check it hasn't changed during the delay
                if (searchQuery !== lastAppliedFilters.search) {
                    lastAppliedFilters.search = searchQuery;
                    // Apply filters and preserve focus
                    applyFilters(true);
                }
            }, 300);
        }
        
        // Cleanup timer on unmount or when searchQuery changes
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
            // Toggle order
            url.searchParams.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column
            url.searchParams.set('sortBy', column);
            url.searchParams.set('sortOrder', 'asc');
        }
        url.searchParams.set('page', '1');
        goto(url.toString(), { invalidateAll: true });
    }

    // Handle filter changes
    function applyFilters(preserveFocus = false, filters?: Record<string, string>) {
        const url = new URL($page.url);
        url.searchParams.set('page', '1');
        
        // Use provided filters or current state
        const search = filters?.search || searchQuery;
        const roleId = filters?.roleId || selectedRoleId;
        const status = filters?.status || selectedStatus;
        
        if (search) {
            url.searchParams.set('search', search);
        } else {
            url.searchParams.delete('search');
        }
        
        if (roleId) {
            url.searchParams.set('roleId', roleId);
        } else {
            url.searchParams.delete('roleId');
        }
        
        if (status === 'active') {
            url.searchParams.set('isActive', 'true');
        } else if (status === 'inactive') {
            url.searchParams.set('isActive', 'false');
        } else {
            url.searchParams.delete('isActive');
        }
        
        // Preserve cursor position if needed
        let cursorPos: number | null = null;
        if (preserveFocus && searchInputRef) {
            const input = searchInputRef as HTMLInputElement;
            if (document.activeElement === input) {
                cursorPos = input.selectionStart;
            }
        }
        
        // Navigate and restore focus
        goto(url.toString(), { 
            invalidateAll: true,
            replaceState: true,
            noScroll: true
        }).then(() => {
            // Restore cursor position after navigation
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
        selectedStatus = "all";
        applyFilters();
    }

    // Check if any filters are active
    const hasActiveFilters = $derived(
        searchQuery !== "" || 
        selectedRoleId !== "" || 
        selectedStatus !== "all"
    );

    // Smart pagination - generate page numbers with ellipsis
    function getPaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | 'ellipsis')[] = [];
        
        if (currentPage <= 4) {
            // Show: 1 2 3 4 5 ... last
            for (let i = 1; i <= 5; i++) {
                pages.push(i);
            }
            pages.push('ellipsis');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            // Show: 1 ... (last-4) (last-3) (last-2) (last-1) last
            pages.push(1);
            pages.push('ellipsis');
            for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show: 1 ... (current-1) current (current+1) ... last
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
</script>

<svelte:head>
    <title>{m.usersAndInvites()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">{m.usersAndInvites()}</h1>
            <p class="text-muted-foreground">
                {m.manageUsersSubtitle()}
            </p>
        </div>
        {#if activeTab === "users" && data.canManage}
            <Button href={i18n.resolveRoute("/users/new", i18n.locale)}>
                <Plus class="mr-2 h-4 w-4" />
                {m.addUser()}
            </Button>
        {/if}
    </div>

    <!-- Tabs -->
    <Tabs.Root bind:value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List>
            <Tabs.Trigger value="users">{m.users()}</Tabs.Trigger>
            <Tabs.Trigger value="invites">{m.invites()}</Tabs.Trigger>
        </Tabs.List>

        <!-- Users Tab -->
        <Tabs.Content value="users" class="space-y-8 mt-8">
            <!-- Enhanced Filters -->
            <Card.Root>
                <Card.Content class="p-6">
                    <div class="space-y-4">
                        <!-- Search Row: Input Only (Auto-triggers after 3 chars) -->
                        <div class="flex gap-3">
                            <div class="relative flex-1">
                                <Search
                                    class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    type="search"
                                    placeholder={m.searchByNameOrEmail()}
                                    class="pl-12 h-11 text-base user-search-input"
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
                                    Clear
                                </Button>
                            {/if}
                        </div>

                        <!-- Filters Row: Role + Status (Full Width) -->
                        <div class="grid grid-cols-2 gap-4">
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

                            <!-- Status Filter -->
                            <div class="space-y-2">
                                <Label for="filter-status" class="text-sm font-semibold">{m.status()}</Label>
                                <Select.Root
                                    type="single"
                                    value={selectedStatus}
                                    onValueChange={(value) => {
                                        if (value && selectedStatus !== value) {
                                            selectedStatus = value;
                                            lastAppliedFilters.status = value;
                                            applyFilters();
                                        }
                                    }}
                                >
                                    <Select.Trigger id="filter-status" class="h-11 w-full">
                                        {selectedStatus === "all" ? m.allStatuses() : selectedStatus === "active" ? m.activeOnly() : m.inactiveOnly()}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="all">{m.allStatuses()}</Select.Item>
                                        <Select.Item value="active">{m.activeOnly()}</Select.Item>
                                        <Select.Item value="inactive">{m.inactiveOnly()}</Select.Item>
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
                                    {#if selectedStatus !== "all"}
                                        <Badge variant="secondary" class="gap-1">
                                            {m.statusLabel()} {selectedStatus === "active" ? m.active() : m.inactive()}
                                            <button
                                                type="button"
                                                onclick={() => {
                                                    selectedStatus = "all";
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

            <!-- Users Table -->
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-6 px-6 pt-6">
                    <div class="space-y-1">
                        <Card.Title class="text-2xl">{m.users()}</Card.Title>
                        <Card.Description class="text-base">
                            {data.total === 0 
                                ? m.noUsersFound() 
                                : m.showingXToYOfZUsers({ 
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
                                                onclick={() => handleSort('firstName')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.sortBy === 'firstName'}
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
                                        <Table.Head class="px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleSort('role')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.sortBy === 'role'}
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
                                    {:else if col.id === 'status'}
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
                                    {:else if col.id === 'lastLogin'}
                                        <Table.Head class="px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleSort('lastLoginAt')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.sortBy === 'lastLoginAt'}
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
                                    {:else if col.id === 'actions'}
                                        <Table.Head class="w-[70px] px-6 py-4"></Table.Head>
                                    {/if}
                                {/each}
                            </Table.Row>
                        </Table.Header>
                <Table.Body>
                    {#if data.users.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={visibleColumns.length} class="h-32 text-center">
                                <div class="flex flex-col items-center justify-center gap-2 py-8">
                                    <p class="text-muted-foreground text-base">
                                        {m.noUsersFound()}
                                    </p>
                                    <p class="text-sm text-muted-foreground/70">
                                        {m.tryAdjustingFilters()}
                                    </p>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data.users as user}
                            <Table.Row class="hover:bg-muted/50">
                                {#each visibleColumns as col}
                                    {#if col.id === 'user'}
                                        <Table.Cell class="px-6 py-4">
                                            <div>
                                                <p class="font-medium">{user.firstName} {user.lastName}</p>
                                                <p class="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </Table.Cell>
                                    {:else if col.id === 'role'}
                                        <Table.Cell class="px-6 py-4">
                                            <Badge variant={getRoleBadgeVariant(user.role.name)}>
                                                {user.role.displayName}
                                            </Badge>
                                        </Table.Cell>
                                    {:else if col.id === 'status'}
                                        <Table.Cell class="px-6 py-4">
                                            {#if user.isActive}
                                                <Badge variant="default" class="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                                    Active
                                                </Badge>
                                            {:else}
                                                <Badge variant="secondary">Inactive</Badge>
                                            {/if}
                                        </Table.Cell>
                                    {:else if col.id === 'lastLogin'}
                                        <Table.Cell class="px-6 py-4 text-muted-foreground text-sm">
                                            {formatDate(user.lastLoginAt)}
                                        </Table.Cell>
                                    {:else if col.id === 'actions'}
                                        <Table.Cell class="px-6 py-4">
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger>
                                                    {#snippet child({ props })}
                                                        <Button {...props} variant="ghost" size="icon">
                                                            <MoreHorizontal class="h-4 w-4" />
                                                            <span class="sr-only">Actions</span>
                                                        </Button>
                                                    {/snippet}
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Content align="end">
                                                    <a href={i18n.resolveRoute(`/users/${user.id}`, i18n.locale)} class="block">
                                                        <DropdownMenu.Item>
                                                            <Pencil class="mr-2 h-4 w-4" />
                                                            {m.edit()}
                                                        </DropdownMenu.Item>
                                                    </a>
                                                    <DropdownMenu.Separator />
                                                    <form method="POST" action="?/toggleActive" use:enhance>
                                                        <input type="hidden" name="userId" value={user.id} />
                                                        <button type="submit" class="w-full">
                                                            <DropdownMenu.Item>
                                                                {#if user.isActive}
                                                                    <UserX class="mr-2 h-4 w-4" />
                                                                    {m.deactivate()}
                                                                {:else}
                                                                    <UserCheck class="mr-2 h-4 w-4" />
                                                                    {m.activate()}
                                                                {/if}
                                                            </DropdownMenu.Item>
                                                        </button>
                                                    </form>
                                                    <DropdownMenu.Separator />
                                                    <DropdownMenu.Item variant="destructive" onclick={() => openDeleteDialog(user.id)}>
                                                        <Trash2 class="mr-2 h-4 w-4" />
                                                        {m.deleteAction()}
                                                    </DropdownMenu.Item>
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Root>
                                        </Table.Cell>
                                    {/if}
                                {/each}
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </Card.Content>

                <!-- Pagination with Records Per Page -->
                {#if data.pages > 1 || data.total > 0}
                    <Card.Footer class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4">
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                {m.pageXOfY({ current: data.currentPage, total: data.pages })}
                            </span>
                            <span class="text-muted-foreground">•</span>
                            <span>
                                {m.totalUsers({ count: Number(data.total) } as any)}
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
                                
                                <!-- Smart Page Numbers with Ellipsis -->
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
        </Tabs.Content>

        <!-- Invites Tab -->
        <Tabs.Content value="invites" class="space-y-8 mt-8">
            {#if data.canManageInvites}
                <Card.Root>
                    <Card.Header>
                        <Card.Title>{m.sendInvite()}</Card.Title>
                        <Card.Description>{m.inviteNewUserSubtitle()}</Card.Description>
                    </Card.Header>
                    <Card.Content>
                        <form method="POST" action="?/createInvite" use:enhance={() => {
                            isCreatingInvite = true;
                            return async ({ update }) => {
                                await update();
                                isCreatingInvite = false;
                            };
                        }} class="grid gap-4 md:grid-cols-3">
                            <div class="md:col-span-2">
                                <label for="invite-email" class="text-sm font-medium">{m.email()}</label>
                                <Input id="invite-email" name="email" type="email" placeholder={m.inviteEmailPlaceholder()} disabled={isCreatingInvite} />
                            </div>
                            <div>
                                <label for="invite-role-select" class="text-sm font-medium">{m.role()}</label>
                                <Select.Root
                                    type="single"
                                    value={selectedInviteRoleId}
                                    onValueChange={(value) => {
                                        if (value) selectedInviteRoleId = value;
                                    }}
                                    disabled={isCreatingInvite}
                                >
                                    <Select.Trigger id="invite-role-select" disabled={isCreatingInvite}>
                                        {data.roles.find((role: { id: string; displayName: string }) => role.id === selectedInviteRoleId)?.displayName ||
                                            m.selectRole()}
                                    </Select.Trigger>
                                    <Select.Content>
                                        {#each data.roles as role (role.id)}
                                            <Select.Item value={role.id}>
                                                {role.displayName}
                                            </Select.Item>
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                                <input type="hidden" name="roleId" value={selectedInviteRoleId} />
                            </div>
                            <div class="flex items-end">
                                <Button type="submit" class="w-full" disabled={isCreatingInvite}>
                                    {#if isCreatingInvite}
                                        <Spinner class="mr-2 h-4 w-4" />
                                        {m.sending()}
                                    {:else}
                                        <MailPlus class="mr-2 h-4 w-4" />
                                        {m.sendInvite()}
                                    {/if}
                                </Button>
                            </div>
                        </form>
                    </Card.Content>
                </Card.Root>
            {/if}

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
                                    placeholder="Search by email... (min 3 characters)"
                                    class="pl-12 h-11 text-base"
                                    bind:value={inviteSearchQuery}
                                    bind:ref={inviteSearchInputRef}
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (inviteSearchDebounceTimer) {
                                                clearTimeout(inviteSearchDebounceTimer);
                                            }
                                            applyInviteFilters(true);
                                        }
                                    }}
                                />
                            </div>
                            {#if hasActiveInviteFilters}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onclick={clearInviteFilters}
                                    class="h-11 gap-2"
                                >
                                    <X class="h-4 w-4" />
                                    {m.clear()}
                                </Button>
                            {/if}
                        </div>

                        <!-- Filters Row -->
                        <div class="grid grid-cols-2 gap-4">
                            <!-- Role Filter -->
                            <div class="space-y-2">
                                <Label for="filter-invite-role" class="text-sm font-semibold">{m.role()}</Label>
                                <Select.Root
                                    type="single"
                                    value={selectedInviteRoleFilter}
                                    onValueChange={(value) => {
                                        const newValue = value || "";
                                        if (selectedInviteRoleFilter !== newValue) {
                                            selectedInviteRoleFilter = newValue;
                                            lastAppliedInviteFilters.roleId = newValue;
                                            applyInviteFilters();
                                        }
                                    }}
                                >
                                    <Select.Trigger id="filter-invite-role" class="h-11 w-full">
                                        {selectedInviteRoleFilter 
                                            ? data.roles.find((r: any) => r.id === selectedInviteRoleFilter)?.displayName 
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

                            <!-- Status Filter -->
                            <div class="space-y-2">
                                <Label for="filter-invite-status" class="text-sm font-semibold">{m.status()}</Label>
                                <Select.Root
                                    type="single"
                                    value={selectedInviteStatus}
                                    onValueChange={(value) => {
                                        if (value && selectedInviteStatus !== value) {
                                            selectedInviteStatus = value;
                                            lastAppliedInviteFilters.status = value;
                                            applyInviteFilters();
                                        }
                                    }}
                                >
                                    <Select.Trigger id="filter-invite-status" class="h-11 w-full">
                                        {selectedInviteStatus === "all" ? m.allStatuses() 
                                            : selectedInviteStatus === "pending" ? "Pending Only"
                                            : selectedInviteStatus === "accepted" ? "Accepted Only"
                                            : selectedInviteStatus === "canceled" ? "Canceled Only"
                                            : "Expired Only"}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="all">{m.allStatuses()}</Select.Item>
                                        <Select.Item value="pending">Pending Only</Select.Item>
                                        <Select.Item value="accepted">Accepted Only</Select.Item>
                                        <Select.Item value="canceled">Canceled Only</Select.Item>
                                        <Select.Item value="expired">Expired Only</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>

                        <!-- Active Filters Badge -->
                        {#if hasActiveInviteFilters}
                            <div class="flex items-center gap-2 pt-2 border-t">
                                <Filter class="h-4 w-4 text-muted-foreground" />
                                <span class="text-sm text-muted-foreground">{m.activeFilters()}</span>
                                <div class="flex flex-wrap gap-2">
                                    {#if inviteSearchQuery}
                                        <Badge variant="secondary" class="gap-1">
                                            Search: {inviteSearchQuery}
                                            <button
                                                type="button"
                                                onclick={() => {
                                                    inviteSearchQuery = "";
                                                    applyInviteFilters();
                                                }}
                                                class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                            >
                                                <X class="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    {/if}
                                    {#if selectedInviteRoleFilter}
                                        <Badge variant="secondary" class="gap-1">
                                            Role: {data.roles.find((r: any) => r.id === selectedInviteRoleFilter)?.displayName}
                                            <button
                                                type="button"
                                                onclick={() => {
                                                    selectedInviteRoleFilter = "";
                                                    applyInviteFilters();
                                                }}
                                                class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                            >
                                                <X class="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    {/if}
                                    {#if selectedInviteStatus !== "all"}
                                        <Badge variant="secondary" class="gap-1">
                                            Status: {selectedInviteStatus.charAt(0).toUpperCase() + selectedInviteStatus.slice(1)}
                                            <button
                                                type="button"
                                                onclick={() => {
                                                    selectedInviteStatus = "all";
                                                    applyInviteFilters();
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

            <!-- Invites Table -->
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-6 px-6 pt-6">
                    <div class="space-y-1">
                        <Card.Title class="text-2xl">{m.invites()}</Card.Title>
                        <Card.Description class="text-base">
                            {data.inviteTotal === 0 
                                ? m.noInvitesFoundMessage() 
                                : m.showingXToYOfZInvites({ 
                                    start: ((data.inviteCurrentPage - 1) * data.inviteLimit) + 1, 
                                    end: Math.min(data.inviteCurrentPage * data.inviteLimit, data.inviteTotal), 
                                    total: data.inviteTotal
                                })}
                        </Card.Description>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={() => showInviteColumnManager = true}
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
                                {#each visibleInviteColumns as col}
                                    {#if col.id === 'email'}
                                        <Table.Head class="w-[250px] px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleInviteSort('email')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.inviteSortBy === 'email'}
                                                    {#if data.inviteSortOrder === 'asc'}
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
                                        <Table.Head class="px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleInviteSort('role')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.inviteSortBy === 'role'}
                                                    {#if data.inviteSortOrder === 'asc'}
                                                        <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                                    {:else}
                                                        <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                                    {/if}
                                                {:else}
                                                    <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                                {/if}
                                            </button>
                                        </Table.Head>
                                    {:else if col.id === 'status'}
                                        <Table.Head class="px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleInviteSort('status')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.inviteSortBy === 'status'}
                                                    {#if data.inviteSortOrder === 'asc'}
                                                        <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                                    {:else}
                                                        <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                                    {/if}
                                                {:else}
                                                    <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                                {/if}
                                            </button>
                                        </Table.Head>
                                    {:else if col.id === 'expires'}
                                        <Table.Head class="px-6 py-4">
                                            <button
                                                type="button"
                                                onclick={() => handleInviteSort('expiresAt')}
                                                class="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
                                            >
                                                {col.label}
                                                {#if data.inviteSortBy === 'expiresAt'}
                                                    {#if data.inviteSortOrder === 'asc'}
                                                        <ArrowUp class="h-3.5 w-3.5 text-primary" />
                                                    {:else}
                                                        <ArrowDown class="h-3.5 w-3.5 text-primary" />
                                                    {/if}
                                                {:else}
                                                    <ArrowUpDown class="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                                {/if}
                                            </button>
                                        </Table.Head>
                                    {:else if col.id === 'actions'}
                                        <Table.Head class="w-[120px] px-6 py-4"></Table.Head>
                                    {/if}
                                {/each}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#if data.invites.length === 0}
                                <Table.Row>
                                    <Table.Cell colspan={visibleInviteColumns.length} class="h-32 text-center">
                                        <div class="flex flex-col items-center justify-center gap-2 py-8">
                                            <p class="text-muted-foreground text-base">
                                                {m.noInvitesFoundMessage()}
                                            </p>
                                            <p class="text-sm text-muted-foreground/70">
                                                {m.tryAdjustingInviteFilters()}
                                            </p>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {:else}
                                {#each data.invites as invite}
                                    <Table.Row class="hover:bg-muted/50">
                                        {#each visibleInviteColumns as col}
                                            {#if col.id === 'email'}
                                                <Table.Cell class="px-6 py-4">
                                                    {invite.email}
                                                </Table.Cell>
                                            {:else if col.id === 'role'}
                                                <Table.Cell class="px-6 py-4">
                                                    <Badge variant="secondary">{invite.role.displayName}</Badge>
                                                </Table.Cell>
                                            {:else if col.id === 'status'}
                                                <Table.Cell class="px-6 py-4">
                                                    <Badge class={statusBadge(invite.status)}>
                                                        {invite.status}
                                                    </Badge>
                                                </Table.Cell>
                                            {:else if col.id === 'expires'}
                                                <Table.Cell class="px-6 py-4">
                                                    <div class="space-y-1">
                                                        <div class="text-sm">{formatDateTime(invite.expiresAt)}</div>
                                                        {#if invite.status === "PENDING"}
                                                            {#if isExpired(invite.expiresAt)}
                                                                <div class="text-xs text-destructive">{m.expired()}</div>
                                                            {:else if isExpiringSoon(invite.expiresAt)}
                                                                <div class="text-xs text-orange-500">{m.expiringSoon()}</div>
                                                            {/if}
                                                        {/if}
                                                    </div>
                                                </Table.Cell>
                                            {:else if col.id === 'actions'}
                                                <Table.Cell class="px-6 py-4">
                                                    <div class="flex items-center gap-1">
                                                        {#if data.canManageInvites && invite.status === "PENDING"}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onclick={() => copyInviteLink(invite.token)}
                                                                title={m.copyInviteLink()}
                                                            >
                                                                <Copy class="h-4 w-4" />
                                                            </Button>
                                                            <form
                                                                method="POST"
                                                                action="?/resendInvite"
                                                                use:enhance={() => {
                                                                    resendingInviteId = invite.id;
                                                                    return async ({ update }) => {
                                                                        await update();
                                                                        resendingInviteId = null;
                                                                    };
                                                                }}
                                                            >
                                                                <input type="hidden" name="inviteId" value={invite.id} />
                                                                <Button
                                                                    type="submit"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title={m.resendInvite()}
                                                                    disabled={resendingInviteId === invite.id}
                                                                >
                                                                    {#if resendingInviteId === invite.id}
                                                                        <Spinner class="h-4 w-4" />
                                                                    {:else}
                                                                        <RotateCw class="h-4 w-4" />
                                                                    {/if}
                                                                </Button>
                                                            </form>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onclick={() => openCancelInviteDialog(invite.id)}
                                                                title={m.cancelInviteAction()}
                                                            >
                                                                <Trash2 class="h-4 w-4" />
                                                            </Button>
                                                        {/if}
                                                    </div>
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
                {#if data.invitePages > 1 || data.inviteTotal > 0}
                    <Card.Footer class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4">
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                {m.pageXOfY({ current: data.inviteCurrentPage, total: data.invitePages })}
                            </span>
                            <span class="text-muted-foreground">•</span>
                            <span>
                                {m.totalInvites({ count: Number(data.inviteTotal) } as any)}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <!-- Records Per Page -->
                            <div class="flex items-center gap-2">
                                <span class="text-sm text-muted-foreground">{m.recordsPerPage()}</span>
                                <Select.Root
                                    type="single"
                                    value={selectedInviteLimit.toString()}
                                    onValueChange={(value) => {
                                        if (value) handleInviteLimitChange(parseInt(value));
                                    }}
                                >
                                    <Select.Trigger class="h-9 w-[100px]">
                                        {selectedInviteLimit}
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
                                    disabled={data.inviteCurrentPage <= 1}
                                    onclick={() => goToInvitePage(data.inviteCurrentPage - 1)}
                                >
                                    <ChevronLeft class="h-4 w-4" />
                                    {m.previous()}
                                </Button>
                                
                                {#each invitePaginationPages as pageItem}
                                    {#if pageItem === 'ellipsis'}
                                        <span class="px-2 text-muted-foreground">...</span>
                                    {:else}
                                        <Button
                                            variant={pageItem === data.inviteCurrentPage ? "default" : "outline"}
                                            size="sm"
                                            onclick={() => goToInvitePage(pageItem)}
                                            class="min-w-[40px]"
                                        >
                                            {pageItem}
                                        </Button>
                                    {/if}
                                {/each}
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={data.inviteCurrentPage >= data.invitePages}
                                    onclick={() => goToInvitePage(data.inviteCurrentPage + 1)}
                                >
                                    {m.next()}
                                    <ChevronRight class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card.Footer>
                {/if}
            </Card.Root>
        </Tabs.Content>
    </Tabs.Root>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{m.areYouSure()}</AlertDialog.Title>
            <AlertDialog.Description>
                {m.deleteUserWarning()}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel
                onclick={() => {
                    showDeleteDialog = false;
                    deleteUserId = null;
                }}
            >
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
                        showDeleteDialog = false;
                    };
                }}
            >
                <input type="hidden" name="userId" value={deleteUserId} />
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={isDeleting}
                >
                    {#if isDeleting}
                        <Spinner class="mr-2 h-4 w-4" />
                    {/if}
                    {m.deleteAction()}
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Cancel Invite Dialog -->
<AlertDialog.Root bind:open={showCancelInviteDialog}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{m.cancelInviteTitle()}</AlertDialog.Title>
            <AlertDialog.Description>
                {m.cancelInviteDescription()}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel
                onclick={() => {
                    showCancelInviteDialog = false;
                    cancelInviteId = null;
                }}
            >
                {m.cancel()}
            </AlertDialog.Cancel>
            <form
                method="POST"
                action="?/cancelInvite"
                use:enhance={() => {
                    isCancelling = true;
                    return async ({ update }) => {
                        await update();
                        isCancelling = false;
                    };
                }}
            >
                <input type="hidden" name="inviteId" value={cancelInviteId} />
                <Button type="submit" variant="destructive" disabled={isCancelling}>
                    {#if isCancelling}
                        <Spinner class="mr-2 h-4 w-4" />
                    {/if}
                    {m.cancelInvite()}
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

<!-- Invite Column Management Dialog -->
<Dialog.Root bind:open={showInviteColumnManager}>
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
                    onclick={resetInviteColumns}
                >
                    {m.resetToDefault()}
                </Button>
            </div>
            
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
                {#each inviteColumns as column, index (column.id)}
                    <div
                        role="button"
                        tabindex="0"
                        class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-move"
                        draggable={true}
                        ondragstart={() => handleInviteDragStart(column.id)}
                        ondragover={(e) => handleInviteDragOver(column.id, e)}
                        ondragend={handleInviteDragEnd}
                        data-column-id={column.id}
                    >
                        <GripVertical class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Checkbox
                            checked={column.visible}
                            onCheckedChange={() => toggleInviteColumn(column.id)}
                            id={`invite-col-${column.id}`}
                        />
                        <Label
                            for={`invite-col-${column.id}`}
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
            <Button onclick={() => showInviteColumnManager = false}>
                {m.done()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
