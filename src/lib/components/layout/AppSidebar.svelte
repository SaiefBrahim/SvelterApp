<script lang="ts">
    import { page } from "$app/stores";
    import * as Sidebar from "$lib/components/ui/sidebar";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Avatar from "$lib/components/ui/avatar";
    import Building from "@lucide/svelte/icons/building";
    import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
    import Users from "@lucide/svelte/icons/users";
    import Shield from "@lucide/svelte/icons/shield";
    import Activity from "@lucide/svelte/icons/activity";
    import FileText from "@lucide/svelte/icons/file-text";
    import Settings from "@lucide/svelte/icons/settings";
    import User from "@lucide/svelte/icons/user";
    import LogOut from "@lucide/svelte/icons/log-out";
    import Languages from "@lucide/svelte/icons/languages";
    import Check from "@lucide/svelte/icons/check";
    import { enhance } from "$app/forms";
    import * as m from "$lib/paraglide/messages.js";
    import { i18n } from "$lib/i18n";
    import { setLanguageTag, languageTag } from "$lib/paraglide-adapter";
    import type { RoleName } from "$lib/server/rbac/permissions";

    interface Props {
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: RoleName;
            organizationId: string | null;
        };
    }

    let { user }: Props = $props();

    const currentPath = $derived($page.url.pathname);

    // Define navigation items with role-based visibility
    const navItems = $derived([
        {
            title: m.dashboard(),
            href: "/dashboard",
            icon: LayoutDashboard,
            roles: [
                "ADMIN",
                "MANAGER",
                "OPERATOR",
            ] as RoleName[],
        },
        {
            title: m.users(),
            href: "/users",
            icon: Users,
            roles: ["ADMIN"] as RoleName[],
        },
        {
            title: m.roles(),
            href: "/roles",
            icon: Shield,
            roles: ["ADMIN"] as RoleName[],
        },
        {
            title: m.activeSessions(),
            href: "/sessions",
            icon: Activity,
            roles: ["ADMIN"] as RoleName[],
        },
        {
            title: m.auditLogs(),
            href: "/audit-logs",
            icon: FileText,
            roles: ["ADMIN"] as RoleName[],
        },
        {
            title: m.organizationSettings(),
            href: "/organization-settings",
            icon: Settings,
            roles: ["ADMIN"] as RoleName[],
        },
    ]);

    // Filter nav items based on user role
    const visibleNavItems = $derived(
        navItems.filter((item) => item.roles.includes(user.role)),
    );

    const userInitials = $derived(
        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
    );

    const userFullName = $derived(`${user.firstName} ${user.lastName}`);

    import { onMount } from "svelte";
    import { browser } from "$app/environment";

    let isSwitchingLanguage = $state(false);
    
    // Track current locale - will be updated on mount
    let currentLocale = $state<"en" | "fr" | "ar">("en");
    
    // Get actual language from localStorage on mount
    onMount(() => {
        if (browser) {
            const stored = localStorage.getItem("locale") as "en" | "fr" | "ar" | null;
            currentLocale = stored || languageTag() as "en" | "fr" | "ar";
        }
    });

    const languages = [
        { value: "en", label: "English", nativeName: "English" },
        { value: "fr", label: "Français", nativeName: "Français" },
        { value: "ar", label: "العربية", nativeName: "العربية" },
    ] as const;

    async function switchLanguage(locale: "en" | "fr" | "ar") {
        if (isSwitchingLanguage || locale === currentLocale) return;
        
        isSwitchingLanguage = true;
        try {
            // 1. Save to localStorage first
            i18n.saveLocale(locale);
            
            // 2. Save to cookie via API
            await fetch("/api/locale", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locale }),
            });
            
            // 3. Set language tag
            setLanguageTag(locale);
            
            // 4. Update local state
            currentLocale = locale;
            
            // 5. Force full page reload to ensure all components re-render with new language
            window.location.reload();
        } catch (error) {
            console.error("Failed to switch language:", error);
            isSwitchingLanguage = false;
        }
    }

</script>

<Sidebar.Root collapsible="icon">
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg" class="w-full justify-start">
                    <div
                        class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                    >
                        <Building class="size-4" />
                    </div>
                    <div class="grid flex-1 text-left text-sm leading-tight">
                        <span class="truncate font-semibold">SvelterApp</span
                        >
                        <span class="truncate text-xs text-muted-foreground"
                            >{m.orgManagement()}</span
                        >
                    </div>
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>

    <Sidebar.Content>
        <Sidebar.Group>
            <Sidebar.GroupLabel>{m.navigation()}</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
                <Sidebar.Menu>
                    {#each visibleNavItems as item}
                        <Sidebar.MenuItem>
                            <Sidebar.MenuButton
                                isActive={currentPath === item.href ||
                                    currentPath.startsWith(item.href + "/")}
                            >
                                {#snippet child({ props })}
                                    <a
                                        href={i18n.resolveRoute(
                                            item.href,
                                            i18n.locale,
                                        )}
                                        {...props}
                                    >
                                        <item.icon class="size-4" />
                                        <span>{item.title}</span>
                                    </a>
                                {/snippet}
                            </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                    {/each}
                </Sidebar.Menu>
            </Sidebar.GroupContent>
        </Sidebar.Group>
    </Sidebar.Content>

    <Sidebar.Footer>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Sidebar.MenuButton
                                size="lg"
                                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                {...props}
                            >
                                <Avatar.Root class="size-8">
                                    <Avatar.Fallback class="bg-primary text-primary-foreground text-xs">
                                        {userInitials}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <div class="grid flex-1 text-left text-sm leading-tight">
                                    <span class="truncate font-semibold">{userFullName}</span>
                                    <span class="truncate text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </Sidebar.MenuButton>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                        class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side="bottom"
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenu.Label class="p-0 font-normal">
                            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar.Root class="size-8 rounded-lg">
                                    <Avatar.Fallback class="rounded-lg bg-primary/10 text-primary">
                                        {userInitials}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <div class="grid flex-1 text-left text-sm leading-tight">
                                    <span class="truncate font-semibold">{userFullName}</span>
                                    <span class="truncate text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <a href={i18n.resolveRoute("/settings", i18n.locale)}>
                            <DropdownMenu.Item>
                                <User class="mr-2 size-4" />
                                <span>{m.settings()}</span>
                            </DropdownMenu.Item>
                        </a>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Sub>
                            <DropdownMenu.SubTrigger>
                                <Languages class="mr-2 size-4" />
                                <span>{m.language()}</span>
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.SubContent>
                                {#each languages as language}
                                    <DropdownMenu.Item
                                        disabled={isSwitchingLanguage}
                                        class="cursor-pointer"
                                        onclick={() => switchLanguage(language.value)}
                                    >
                                        <span class="flex-1">{language.nativeName}</span>
                                        {#if currentLocale === language.value}
                                            <Check class="size-4 text-primary" />
                                        {/if}
                                    </DropdownMenu.Item>
                                {/each}
                            </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                        <DropdownMenu.Separator />
                        <form method="POST" action={i18n.resolveRoute("/logout", i18n.locale)} use:enhance>
                            <button type="submit" class="w-full">
                                <DropdownMenu.Item>
                                    <LogOut class="mr-2 size-4" />
                                    <span>{m.signOut()}</span>
                                </DropdownMenu.Item>
                            </button>
                        </form>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Footer>

</Sidebar.Root>
