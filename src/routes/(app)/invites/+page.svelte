<script lang="ts">
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import { Spinner } from "$lib/components/ui/spinner";
    import { page } from "$app/stores";
    import MailPlus from "@lucide/svelte/icons/mail-plus";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import RotateCw from "@lucide/svelte/icons/rotate-cw";
    import Copy from "@lucide/svelte/icons/copy";
    import * as m from "$lib/paraglide/messages.js";
    import { toast } from "svelte-sonner";

    let { data, form } = $props();

    let selectedRoleId = $state("");
    let selectedOrganizationId = $state("");
    let showCancelDialog = $state(false);
    let isCreatingInvite = $state(false);

    // Initialize from data
    $effect(() => {
        selectedRoleId = data.roles[0]?.id ?? "";
        selectedOrganizationId = data.defaultOrganizationId ?? "";
    });
    let cancelInviteId = $state<string | null>(null);
    let isCancelling = $state(false);
    let resendingInviteId = $state<string | null>(null);

    function openCancelDialog(inviteId: string) {
        cancelInviteId = inviteId;
        showCancelDialog = true;
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString();
    }

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

    function getExpirationStatus(expiresAt: Date, status: string) {
        if (status !== "PENDING") return null;
        if (isExpired(expiresAt)) return { text: m.expired(), class: "text-destructive" };
        if (isExpiringSoon(expiresAt)) return { text: m.expiringSoon(), class: "text-orange-500" };
        return null;
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

    $effect(() => {
        if (form?.success) {
            toast.success(m.actionCompleted());
            showCancelDialog = false;
            cancelInviteId = null;
            resendingInviteId = null;
        }
    });
</script>

<svelte:head>
    <title>{m.invites()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <div>
        <h1 class="text-3xl font-bold tracking-tight">{m.invites()}</h1>
        <p class="text-muted-foreground">{m.invitesSubtitle()}</p>
    </div>

    {#if data.canManage}
        <Card.Root>
            <Card.Header>
                <Card.Title>{m.sendInvite()}</Card.Title>
                <Card.Description>{m.sendInviteSubtitle()}</Card.Description>
            </Card.Header>
            <Card.Content>
                <form method="POST" action="?/create" use:enhance={() => {
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
                            value={selectedRoleId}
                            onValueChange={(value) => {
                                if (value) selectedRoleId = value;
                            }}
                            disabled={isCreatingInvite}
                        >
                            <Select.Trigger id="invite-role-select" disabled={isCreatingInvite}>
                                {data.roles.find((role) => role.id === selectedRoleId)?.displayName ||
                                    m.selectRole()}
                            </Select.Trigger>
                            <Select.Content>
                                {#each data.roles as role}
                                    <Select.Item value={role.id}>
                                        {role.displayName}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <input type="hidden" name="roleId" value={selectedRoleId} />
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

    <Card.Root>
        <Card.Content class="p-0">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>{m.email()}</Table.Head>
                        <Table.Head>{m.role()}</Table.Head>
                        <Table.Head>{m.organization()}</Table.Head>
                        <Table.Head>{m.status()}</Table.Head>
                        <Table.Head>{m.expires()}</Table.Head>
                        <Table.Head class="w-[120px]">{m.actions()}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if data.invites.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={7} class="h-24 text-center">
                                <p class="text-muted-foreground">
                                    {m.noInvitesFound()}
                                </p>
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data.invites as invite}
                            <Table.Row>
                                <Table.Cell>{invite.email}</Table.Cell>
                                <Table.Cell>
                                    <Badge variant="secondary">{invite.role.displayName}</Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    {invite.organization?.name || "—"}
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge class={statusBadge(invite.status)}>
                                        {invite.status}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
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
                                <Table.Cell>
                                    <div class="flex items-center gap-1">
                                        {#if data.canManage && invite.status === "PENDING"}
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
                                                action="?/resend"
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
                                                onclick={() => openCancelDialog(invite.id)}
                                                title={m.cancelInviteAction()}
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        {/if}
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </Card.Content>
    </Card.Root>
</div>

<AlertDialog.Root bind:open={showCancelDialog}>
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
                    showCancelDialog = false;
                    cancelInviteId = null;
                }}
            >
                {m.cancel()}
            </AlertDialog.Cancel>
            <form
                method="POST"
                action="?/cancel"
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
