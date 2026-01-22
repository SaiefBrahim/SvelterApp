import type { RequestEvent } from '@sveltejs/kit';
import type { AuthSession } from '../rbac/guards';

/**
 * Audit context extracted from request
 */
export interface AuditContext {
    userId: string | null;
    organizationId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}

/**
 * Extract audit context from a SvelteKit request event
 */
export function getAuditContext(event: RequestEvent, session: AuthSession | null): AuditContext {
    let ipAddress = 'unknown';
    try {
        ipAddress = event.getClientAddress();
    } catch {
        // Fallback if getClientAddress is not available
        ipAddress = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   event.request.headers.get('x-real-ip') || 
                   'unknown';
    }
    const userAgent = event.request.headers.get('user-agent') || null;

    return {
        userId: session?.user.id || null,
        organizationId: session?.user.organizationId || null,
        ipAddress,
        userAgent
    };
}

/**
 * Extract audit context from session only (for service-level calls)
 */
export function getAuditContextFromSession(session: AuthSession | null): Omit<AuditContext, 'ipAddress' | 'userAgent'> {
    return {
        userId: session?.user.id || null,
        organizationId: session?.user.organizationId || null
    };
}
