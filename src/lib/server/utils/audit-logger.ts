import { AuditLogService } from '../services/audit-log.service';
import type { AuditContext } from './audit-context';

/**
 * Standard audit log actions
 */
export const AUDIT_ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    ACTIVATE: 'ACTIVATE',
    DEACTIVATE: 'DEACTIVATE',
    CANCEL: 'CANCEL',
    ACCEPT: 'ACCEPT',
    RESEND: 'RESEND',
    RESET_PASSWORD: 'RESET_PASSWORD',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    SIGNUP: 'SIGNUP'
} as const;

/**
 * Standard audit log resources
 */
export const AUDIT_RESOURCES = {
    USER: 'users',
    ORGANIZATION: 'organizations',
    ROLE: 'roles',
    PERMISSION: 'permissions',
    INVITE: 'invites',
    SESSION: 'sessions',
    AUDIT_LOG: 'audit_logs',
    ORGANIZATION_SETTINGS: 'organization_settings'
} as const;

export interface AuditLogOptions {
    action: string;
    resource: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown> | null;
    context?: Partial<AuditContext>;
}

/**
 * Create an audit log entry with automatic context extraction
 * This is the main function to use for logging activities
 */
export async function logActivity(
    options: AuditLogOptions,
    auditContext?: AuditContext
): Promise<void> {
    try {
        await AuditLogService.create({
            action: options.action,
            resource: options.resource,
            resourceId: options.resourceId ?? null,
            userId: auditContext?.userId ?? options.context?.userId ?? null,
            organizationId: auditContext?.organizationId ?? options.context?.organizationId ?? null,
            metadata: options.metadata ?? null,
            ipAddress: auditContext?.ipAddress ?? options.context?.ipAddress ?? null,
            userAgent: auditContext?.userAgent ?? options.context?.userAgent ?? null
        });
    } catch (error) {
        // Don't throw - audit logging should never break the main flow
        console.error('Failed to create audit log:', error);
    }
}

/**
 * Helper to log user activities
 */
export async function logUserActivity(
    action: string,
    resourceId: string | null,
    metadata?: Record<string, unknown> | null,
    auditContext?: AuditContext
): Promise<void> {
    await logActivity(
        {
            action,
            resource: AUDIT_RESOURCES.USER,
            resourceId,
            metadata
        },
        auditContext
    );
}

/**
 * Helper to log organization activities
 */
export async function logOrganizationActivity(
    action: string,
    resourceId: string | null,
    metadata?: Record<string, unknown> | null,
    auditContext?: AuditContext
): Promise<void> {
    await logActivity(
        {
            action,
            resource: AUDIT_RESOURCES.ORGANIZATION,
            resourceId,
            metadata
        },
        auditContext
    );
}

/**
 * Helper to log role activities
 */
export async function logRoleActivity(
    action: string,
    resourceId: string | null,
    metadata?: Record<string, unknown> | null,
    auditContext?: AuditContext
): Promise<void> {
    await logActivity(
        {
            action,
            resource: AUDIT_RESOURCES.ROLE,
            resourceId,
            metadata
        },
        auditContext
    );
}

/**
 * Helper to log invite activities
 */
export async function logInviteActivity(
    action: string,
    resourceId: string | null,
    metadata?: Record<string, unknown> | null,
    auditContext?: AuditContext
): Promise<void> {
    await logActivity(
        {
            action,
            resource: AUDIT_RESOURCES.INVITE,
            resourceId,
            metadata
        },
        auditContext
    );
}
