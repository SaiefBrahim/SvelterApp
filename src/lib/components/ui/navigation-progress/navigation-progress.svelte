<script lang="ts">
	import { navigating } from "$app/stores";
	import { browser } from "$app/environment";
	import { Progress } from "$lib/components/ui/progress";
	import { cn } from "$lib/utils.js";
	import { onDestroy } from "svelte";

	let {
		class: className,
		...restProps
	}: {
		class?: string;
	} = $props();

	let progress = $state(0);
	let show = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	// Use non-reactive variable to track previous state (avoids reactive dependency)
	let lastNavigatingState: boolean | null = null;

	// Track navigation state
	const isNavigating = $derived($navigating !== null);

	// Effect with proper guard to prevent infinite loops
	$effect(() => {
		if (!browser) return;

		const currentState = isNavigating;

		// Guard: only proceed if state actually changed
		if (currentState === lastNavigatingState) {
			return;
		}

		// Update tracking state (non-reactive, so doesn't trigger effect)
		lastNavigatingState = currentState;

		// Cleanup existing timers
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}

		if (currentState) {
			// Navigation started
			show = true;
			progress = 0;

			// Start progress simulation with closure to track progress
			let currentProgress = 0;
			intervalId = setInterval(() => {
				currentProgress = Math.min(currentProgress + Math.random() * 15, 90);
				progress = currentProgress;
			}, 100);
		} else {
			// Navigation ended
			if (show) {
				progress = 100;
				timeoutId = setTimeout(() => {
					show = false;
					progress = 0;
				}, 200);
			}
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
</script>

{#if show}
	<div
		class={cn(
			"fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent",
			className
		)}
		{...restProps}
	>
		<div
			class="h-full bg-primary transition-all duration-300 ease-out"
			style="width: {progress}%"
		></div>
	</div>
{/if}
