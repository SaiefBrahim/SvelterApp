import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';

// Auto-include all dependencies to prevent "optimized dependencies changed" reloads
function getOptimizeDepsInclude(): string[] {
	const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
	const deps = [
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.devDependencies || {})
	];
	
	// Packages that shouldn't be pre-bundled (server-side, build tools, etc.)
	const excludePackages = new Set([
		'@sveltejs/kit',
		'@sveltejs/adapter-auto',
		'@sveltejs/vite-plugin-svelte',
		'svelte',
		'svelte-check',
		'vite',
		'typescript',
		'prisma',
		'@prisma/client',
		'@prisma/adapter-pg',
		'@auth/prisma-adapter',
		'@auth/sveltekit',
		'@tailwindcss/vite',
		'tailwindcss',
		'tsx',
		'@types/node',
		'@types/pg',
		'@types/bcryptjs',
		'@lucide/svelte', // Excluded separately - works better as native ESM
		'pg',
		'bcryptjs',
		'dotenv',
		'resend',
		'@inlang/paraglide-js',
		'tw-animate-css'
	]);
	
	// Filter main packages
	const includeDeps = deps.filter(dep => !excludePackages.has(dep));
	
	// Add common sub-paths that packages export
	const subPaths: Record<string, string[]> = {
		'zod': ['zod/v3'],
		'sveltekit-superforms': ['sveltekit-superforms/client', 'sveltekit-superforms/adapters']
	};
	
	// Add sub-paths for included packages
	for (const dep of includeDeps) {
		if (subPaths[dep]) {
			includeDeps.push(...subPaths[dep]);
		}
	}
	
	return includeDeps;
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	optimizeDeps: {
		// Auto-include all frontend dependencies to prevent page reloads during navigation
		include: getOptimizeDepsInclude(),
		// Exclude lucide icons - they work better as native ESM
		exclude: ['@lucide/svelte']
	},
	ssr: {
		// Ensure lucide is bundled for SSR
		noExternal: ['@lucide/svelte']
	}
});
