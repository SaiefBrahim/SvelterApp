<script lang="ts">
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import { Button } from "$lib/components/ui/button";
    import { i18n } from "$lib/i18n";
    import { setLanguageTag, languageTag } from "$lib/paraglide-adapter";
    import { goto, invalidateAll } from "$app/navigation";
    import Languages from "@lucide/svelte/icons/languages";
    import Check from "@lucide/svelte/icons/check";
    import * as m from "$lib/paraglide/messages.js";

    import { onMount } from "svelte";
    import { browser } from "$app/environment";

    let isSwitchingLanguage = $state(false);
    
    // Track current locale - will be updated on mount
    let currentLocale = $state<"en" | "fr" | "ar">("en");
    
    // Get actual language from localStorage on mount
    onMount(() => {
        if (browser) {
            const stored = localStorage.getItem("locale") as "en" | "fr" | "ar" | null;
            currentLocale = stored || i18n.getLocaleFromStorage();
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

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        {#snippet child({ props })}
            <Button
                {...props}
                variant="ghost"
                size="sm"
                class="h-9 gap-2 px-3 text-sm hover:bg-accent"
                disabled={isSwitchingLanguage}
            >
                <Languages class="h-4 w-4" />
                <span class="font-medium">
                    {languages.find((item) => item.value === currentLocale)?.nativeName}
                </span>
            </Button>
        {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="center" class="w-48">
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
