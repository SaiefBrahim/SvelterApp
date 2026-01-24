<script lang="ts">
	import "../app.css";
	import { Toaster } from "$lib/components/ui/sonner";
	import { NavigationProgress } from "$lib/components/ui/navigation-progress";
	import { ModeWatcher } from "mode-watcher";
	import { browser } from "$app/environment";
	import { setLanguageTag, languageTag } from "$lib/paraglide-adapter";
	import { i18n } from "$lib/i18n";
	import * as m from "$lib/paraglide/messages.js";
	import { onMount } from "svelte";

	let { children, data } = $props();
	
	// Initialize language immediately on client before any rendering
	if (browser) {
		const storedLocale = i18n.getLocaleFromStorage();
		setLanguageTag(storedLocale);
		
		// CRITICAL: Set document attributes IMMEDIATELY for correct direction
		document.documentElement.lang = storedLocale;
		document.documentElement.dir = storedLocale === "ar" ? "rtl" : "ltr";
		
		// Also set HTML class for styling purposes
		document.documentElement.setAttribute('data-locale', storedLocale);
	}

	// Double-check on mount to ensure everything is set
	onMount(() => {
		if (browser) {
			const storedLocale = i18n.getLocaleFromStorage();
			document.documentElement.lang = storedLocale;
			document.documentElement.dir = storedLocale === "ar" ? "rtl" : "ltr";
			document.documentElement.setAttribute('data-locale', storedLocale);
		}
	});
</script>

<svelte:head>
	<title>{m.appTitle()}</title>
	<meta
		name="description"
		content={m.appDescription()}
	/>
</svelte:head>

<ModeWatcher />
<NavigationProgress />
<Toaster richColors position="top-right" />

{@render children()}
