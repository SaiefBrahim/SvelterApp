// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { AuthSession } from '$lib/server/auth';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
		auth: () => Promise<AuthSession | null>;
		session: AuthSession | null;
		locale?: string;
		}

		interface PageData {
		session: AuthSession | null;
		}

		// interface PageState {}
		// interface Platform {}
	}
}

export { };
