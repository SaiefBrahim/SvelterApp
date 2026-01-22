<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import Users from "@lucide/svelte/icons/users";
    import Shield from "@lucide/svelte/icons/shield";
    import Activity from "@lucide/svelte/icons/activity";
    import * as m from "$lib/paraglide/messages.js";
    import { i18n } from "$lib/i18n";

    let { data } = $props();

    // Type-safe helper to get totalUsersLabel
    // After compilation, m.totalUsersLabel will be available
    type MessagesWithTotalUsersLabel = typeof m & { totalUsersLabel?: () => string };
    const messagesWithLabel = m as MessagesWithTotalUsersLabel;
    
    const totalUsersLabel = $derived(
        messagesWithLabel.totalUsersLabel ? messagesWithLabel.totalUsersLabel() : 'Total Users'
    );

    const stats = $derived([
        {
            title: totalUsersLabel,
            value: data.stats.totalUsers,
            icon: Users,
            description: totalUsersLabel,
        },
        {
            title: m.roles(),
            value: data.stats.totalRoles,
            icon: Shield,
            description: m.systemRoles(),
        },
        {
            title: m.activeSessions(),
            value: data.stats.activeSessions,
            icon: Activity,
            description: m.activeSessions(),
        },
    ]);
</script>

<svelte:head>
    <title>{m.dashboard()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6">
    <!-- Page Header -->
    <div>
        <h1 class="text-3xl font-bold tracking-tight">{m.dashboard()}</h1>
        <p class="text-muted-foreground">
            {m.welcomeBack({ name: data.user.firstName })}
        </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-3">
        {#each stats as stat}
            <Card.Root>
                <Card.Header
                    class="flex flex-row items-center justify-between space-y-0 pb-2"
                >
                    <Card.Title class="text-sm font-medium"
                        >{stat.title}</Card.Title
                    >
                    <stat.icon class="h-4 w-4 text-muted-foreground" />
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{stat.value}</div>
                    <p class="text-xs text-muted-foreground">
                        {stat.description}
                    </p>
                </Card.Content>
            </Card.Root>
        {/each}
    </div>

    <!-- Role Badge -->
    <Card.Root>
        <Card.Header>
            <Card.Title>{m.yourProfile()}</Card.Title>
            <Card.Description>{m.rolePermissions()}</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="flex items-center gap-4">
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
                >
                    <Users class="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p class="font-medium">
                        {data.user.firstName}
                        {data.user.lastName}
                    </p>
                    <div class="flex items-center gap-2">
                        <p class="text-sm text-muted-foreground">
                            {data.user.email}
                        </p>
                        <Badge variant="secondary"
                            >{data.user.role.replace("_", " ")}</Badge
                        >
                    </div>
                </div>
            </div>
        </Card.Content>
    </Card.Root>

    <!-- Quick Actions -->
    {#if data.user.role === "ADMIN"}
        <Card.Root>
            <Card.Header>
                <Card.Title>{m.quickActions()}</Card.Title>
                <Card.Description>{m.commonTasks()}</Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="flex flex-wrap gap-2">
                    <a
                        href={i18n.resolveRoute("/users/new", i18n.locale)}
                        class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                    >
                        <Users class="mr-2 h-4 w-4" />
                        {m.addUser()}
                    </a>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}
</div>
