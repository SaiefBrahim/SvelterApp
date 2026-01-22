import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import {
    type Permission,
    type RoleName,
    ROLES,
    roleHasPermission,
    isRoleAtLeast,
    canManageRole
} from './permissions';
import type { AuthSession } from '../auth';

// Re-export for convenience
export type { AuthSession };
export type AuthenticatedUser = AuthSession['user'];

// ============================================
// AUTHENTICATION GUARDS
// ============================================

/**
 * Require authentication - redirects to login if not authenticated
 */
export function requireAuth(event: RequestEvent): AuthSession {
    const session = event.locals.session as AuthSession | null;

    if (!session?.user) {
        throw redirect(303, '/login');
    }

    if (!session.user.isActive) {
        throw redirect(303, '/login?error=AccountDisabled');
    }

    return session;
}

/**
 * Require a specific role or higher
 */
export function requireRole(event: RequestEvent, minimumRole: RoleName): AuthSession {
    const session = requireAuth(event);

    if (!isRoleAtLeast(session.user.role, minimumRole)) {
        throw error(403, {
            message: 'You do not have permission to access this resource'
        });
    }

    return session;
}

/**
 * Require a specific permission
 */
export function requirePermission(event: RequestEvent, permission: Permission): AuthSession {
    const session = requireAuth(event);

    if (!roleHasPermission(session.user.role, permission)) {
        throw error(403, {
            message: 'You do not have permission to perform this action'
        });
    }

    return session;
}

/**
 * Require ADMIN role
 */
export function requireAdmin(event: RequestEvent): AuthSession {
    return requireRole(event, ROLES.ADMIN);
}

/**
 * Require MANAGER role or higher
 */
export function requireManager(event: RequestEvent): AuthSession {
    return requireRole(event, ROLES.MANAGER);
}

// ============================================
// ORGANIZATION SCOPING GUARDS
// ============================================

/**
 * Get the organization ID for scoped queries
 * All users are scoped to their organization
 */
export function getOrganizationScope(session: AuthSession): string | null {
    return session.user.organizationId;
}

/**
 * Check if user can access a specific organization's data
 */
export function canAccessOrganization(session: AuthSession, organizationId: string): boolean {
    // SUPER_ADMIN can access all organizations
    if (session.user.role === ROLES.SUPER_ADMIN) return true;
    return session.user.organizationId === organizationId;
}

/**
 * Require access to a specific organization
 */
export function requireOrganizationAccess(event: RequestEvent, organizationId: string): AuthSession {
    const session = requireAuth(event);

    if (!canAccessOrganization(session, organizationId)) {
        throw error(403, {
            message: 'You do not have access to this organization'
        });
    }

    return session;
}

// ============================================
// USER MANAGEMENT GUARDS
// ============================================

/**
 * Check if user can manage another user
 */
export function canManageUser(
    session: AuthSession,
    targetUser: { role: RoleName; organizationId: string | null }
): boolean {
    // SUPER_ADMIN can manage all users
    if (session.user.role === ROLES.SUPER_ADMIN) return true;

    // Must be in the same organization
    if (session.user.organizationId !== targetUser.organizationId) {
        return false;
    }

    // Can only manage users with lower role level
    return canManageRole(session.user.role, targetUser.role);
}

/**
 * Check if user can assign a specific role
 * Users can assign any role from their organization, including their own role
 */
export function canAssignRole(session: AuthSession, targetRole: RoleName): boolean {
    // SUPER_ADMIN can assign any role
    if (session.user.role === ROLES.SUPER_ADMIN) return true;
    
    // For organization users, they can assign any role from their organization
    // This includes their own role level
    // The organization check is handled at the service level when fetching roles
    return true;
}

// ============================================
// DATA ACCESS HELPERS
// ============================================

/**
 * Build a Prisma where clause with organization scoping
 */
export function withOrganizationScope<T extends Record<string, unknown>>(
    session: AuthSession,
    where: T = {} as T
): T & { organizationId?: string } {
    // SUPER_ADMIN is not scoped to any organization
    if (session.user.role === ROLES.SUPER_ADMIN) {
        return where;
    }

    const organizationId = getOrganizationScope(session);

    if (organizationId) {
        return { ...where, organizationId };
    }

    return where;
}

/**
 * Check if the current user is accessing their own resource
 */
export function isOwnResource(session: AuthSession, resourceUserId: string): boolean {
    return session.user.id === resourceUserId;
}
