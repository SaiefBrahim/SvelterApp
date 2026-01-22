<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { Spinner } from "$lib/components/ui/spinner";
	import { i18n } from "$lib/i18n";
	import * as m from "$lib/paraglide/messages.js";

	let { data } = $props();

	onMount(() => {
		if (data.session?.user) {
			goto(i18n.resolveRoute("/dashboard", i18n.locale));
		} else {
			goto(i18n.resolveRoute("/login", i18n.locale));
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="flex flex-col items-center gap-4">
		<Spinner class="h-8 w-8" />
		<p class="text-muted-foreground">{m.loading()}</p>
	</div>
</div>
