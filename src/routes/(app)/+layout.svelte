<script lang="ts">
    import {
        SidebarProvider,
        SidebarInset,
        SidebarTrigger,
    } from "$lib/components/ui/sidebar";
    import { Separator } from "$lib/components/ui/separator";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Avatar from "$lib/components/ui/avatar";
    import { Button } from "$lib/components/ui/button";
    import AppSidebar from "$lib/components/layout/AppSidebar.svelte";
    import type { Snippet } from "svelte";
    import { i18n } from "$lib/i18n";
    import * as m from "$lib/paraglide/messages.js";
    import { setLanguageTag, languageTag } from "$lib/paraglide-adapter";
    import { invalidateAll } from "$app/navigation";
    import { enhance } from "$app/forms";
    import { toggleMode, mode } from "mode-watcher";
    import Moon from "@lucide/svelte/icons/moon";
    import Sun from "@lucide/svelte/icons/sun";
    import Settings from "@lucide/svelte/icons/settings";
    import LogOut from "@lucide/svelte/icons/log-out";
    import Globe from "@lucide/svelte/icons/globe";
    import Check from "@lucide/svelte/icons/check";
    import { Spinner } from "$lib/components/ui/spinner";

    let { data, children }: { data: { user: any }; children: Snippet } =
        $props();

    const currentMode = $derived(mode.current);
    import { onMount } from "svelte";
    import { browser } from "$app/environment";

    let isSwitchingLanguage = $state(false);
    let isLoggingOut = $state(false);
    
    // Track current locale - will be updated on mount
    let currentLocale = $state<"en" | "fr" | "ar">("en");
    
    // Get actual language from localStorage on mount
    onMount(() => {
        if (browser) {
            const stored = localStorage.getItem("locale") as "en" | "fr" | "ar" | null;
            currentLocale = stored || i18n.getLocaleFromStorage();
        }
    });

    const userInitials = $derived(
        `${data.user.firstName.charAt(0)}${data.user.lastName.charAt(0)}`.toUpperCase(),
    );

    const userFullName = $derived(`${data.user.firstName} ${data.user.lastName}`);

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

<SidebarProvider>
    <AppSidebar user={data.user} />
    <SidebarInset>
        <!-- Header -->
        <header
            class="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
            <div class="flex items-center gap-2 px-4">
                <SidebarTrigger class="-ml-1" />
                <Separator orientation="vertical" class="mr-2 h-4" />
            </div>
            <div class="flex items-center gap-2 px-4">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="ghost" size="sm" class="h-9 gap-2">
                                <Globe class="h-4 w-4" />
                                <span class="font-medium hidden md:inline">
                                    {languages.find((item) => item.value === currentLocale)?.nativeName}
                                </span>
                            </Button>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-48">
                        <DropdownMenu.Label class="text-xs font-semibold px-2 py-1.5">
                            {m.language()}
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        {#each languages as language}
                            <DropdownMenu.Item
                                disabled={isSwitchingLanguage}
                                class="cursor-pointer"
                                onclick={() => switchLanguage(language.value)}
                            >
                                <span class="flex-1">{language.nativeName}</span>
                                {#if currentLocale === language.value}
                                    <Check class="h-4 w-4 text-primary" />
                                {/if}
                            </DropdownMenu.Item>
                        {/each}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="ghost" size="icon">
                                <Avatar.Root class="size-8">
                                    <Avatar.Fallback class="bg-primary/10 text-primary">
                                        {userInitials}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                            </Button>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-56">
                        <DropdownMenu.Label class="p-0 font-normal">
                            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar.Root class="size-8 rounded-lg">
                                    <Avatar.Fallback class="rounded-lg bg-primary/10 text-primary">
                                        {userInitials}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <div class="grid flex-1 text-left text-sm leading-tight">
                                    <span class="truncate font-semibold">{userFullName}</span>
                                    <span class="truncate text-xs text-muted-foreground">{data.user.email}</span>
                                </div>
                            </div>
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onclick={() => toggleMode()}>
                            {#if currentMode === "dark"}
                                <Sun class="mr-2 size-4" />
                                <span>{m.lightMode()}</span>
                            {:else}
                                <Moon class="mr-2 size-4" />
                                <span>{m.darkMode()}</span>
                            {/if}
                        </DropdownMenu.Item>
                        <a href={i18n.resolveRoute("/settings", i18n.locale)} class="block">
                            <DropdownMenu.Item>
                                <Settings class="mr-2 size-4" />
                                <span>{m.settings()}</span>
                            </DropdownMenu.Item>
                        </a>
                        <DropdownMenu.Separator />
                        <form method="POST" action={i18n.resolveRoute("/logout", i18n.locale)} use:enhance={() => {
                            isLoggingOut = true;
                            return async ({ update }) => {
                                await update();
                                isLoggingOut = false;
                            };
                        }}>
                            <button type="submit" class="w-full" disabled={isLoggingOut}>
                                <DropdownMenu.Item disabled={isLoggingOut}>
                                    {#if isLoggingOut}
                                        <Spinner class="mr-2 size-4" />
                                    {:else}
                                        <LogOut class="mr-2 size-4" />
                                    {/if}
                                    <span>{m.signOut()}</span>
                                </DropdownMenu.Item>
                            </button>
                        </form>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        </header>

        <!-- Main content -->
        <main class="flex-1 p-4 md:p-6">
            {@render children()}
        </main>
    </SidebarInset>
</SidebarProvider>
