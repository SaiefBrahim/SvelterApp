import { handle as authHandle } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import type { AuthSession } from '$lib/server/rbac/guards';
import { i18n } from '$lib/i18n';

/**
 * Session loading handle - makes session available in locals
 */
const sessionHandle: Handle = async ({ event, resolve }) => {
    // Get session from auth
    const session = await event.locals.auth?.();
    event.locals.session = session as AuthSession | null;

    return resolve(event);
};

/**
 * Security headers handle
 */
const securityHandle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
};

// Combine all handles - Auth should generally be first to catch its internal routes
export const handle = sequence(authHandle, i18n.handle(), sessionHandle, securityHandle);
