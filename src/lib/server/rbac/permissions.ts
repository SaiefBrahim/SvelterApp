/**
 * RBAC Permission Definitions
 * Central source of truth for all permissions in the system
 */

// ============================================
// ROLE DEFINITIONS
// ============================================
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    OPERATOR: 'OPERATOR'
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy levels (higher = more permissions)
export const ROLE_HIERARCHY: Record<RoleName, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    MANAGER: 2,
    OPERATOR: 1
};

export const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
    SUPER_ADMIN: 'Super Administrator',
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    OPERATOR: 'Operator'
};

// ============================================
// PERMISSION DEFINITIONS
// ============================================
export const RESOURCES = {
    USERS: 'users',
    ROLES: 'roles',
    AUDIT_LOGS: 'audit_logs',
    INVITES: 'invites',
    SESSIONS: 'sessions',
    ORGANIZATION_SETTINGS: 'organization_settings'
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

export const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    MANAGE: 'manage' // Full control including special operations
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// Permission string format: "resource:action"
export type Permission = `${Resource}:${Action}`;

// ============================================
// PERMISSION CONSTANTS
// ============================================
export const PERMISSIONS = {
    // User permissions
    USERS_CREATE: 'users:create' as Permission,
    USERS_READ: 'users:read' as Permission,
    USERS_UPDATE: 'users:update' as Permission,
    USERS_DELETE: 'users:delete' as Permission,
    USERS_MANAGE: 'users:manage' as Permission,

    // Role permissions
    ROLES_READ: 'roles:read' as Permission,
    ROLES_MANAGE: 'roles:manage' as Permission,

    // Audit log permissions
    AUDIT_LOGS_READ: 'audit_logs:read' as Permission,

    // Invite permissions
    INVITES_READ: 'invites:read' as Permission,
    INVITES_MANAGE: 'invites:manage' as Permission,

    // Session permissions
    SESSIONS_READ: 'sessions:read' as Permission,
    SESSIONS_MANAGE: 'sessions:manage' as Permission,

    // Organization settings permissions
    ORGANIZATION_SETTINGS_READ: 'organization_settings:read' as Permission,
    ORGANIZATION_SETTINGS_UPDATE: 'organization_settings:update' as Permission,
    ORGANIZATION_SETTINGS_MANAGE: 'organization_settings:manage' as Permission
} as const;

// ============================================
// DEFAULT ROLE PERMISSIONS
// ============================================
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
    SUPER_ADMIN: [
        // SUPER_ADMIN has no permissions in database - bypasses all checks
    ],
    ADMIN: [
        // Full organization management
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.ROLES_MANAGE,
        PERMISSIONS.AUDIT_LOGS_READ,
        PERMISSIONS.INVITES_MANAGE,
        PERMISSIONS.SESSIONS_MANAGE,
        PERMISSIONS.ORGANIZATION_SETTINGS_MANAGE
    ],
    MANAGER: [
        // Read users in organization
        PERMISSIONS.USERS_READ,
        PERMISSIONS.ROLES_READ,
        PERMISSIONS.SESSIONS_READ
    ],
    OPERATOR: [
        // Minimal permissions (can read own profile only - handled at application level)
    ]
};

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(roleName: RoleName, permission: Permission): boolean {
    // SUPER_ADMIN bypasses all permission checks
    if (roleName === ROLES.SUPER_ADMIN) return true;

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[roleName];
    if (!rolePermissions) return false;

    // Check for exact permission match
    if (rolePermissions.includes(permission)) return true;

    // Check for manage permission (grants all actions on resource)
    const [resource] = permission.split(':') as [Resource, Action];
    const managePermission = `${resource}:manage` as Permission;
    if (rolePermissions.includes(managePermission)) return true;

    return false;
}

/**
 * Check if a role level is higher or equal to another
 */
export function isRoleAtLeast(roleName: RoleName, minimumRole: RoleName): boolean {
    // SUPER_ADMIN is always at least any role
    if (roleName === ROLES.SUPER_ADMIN) return true;
    return ROLE_HIERARCHY[roleName] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleName: RoleName): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[roleName] || [];
}

/**
 * Check if a role can manage another role (can only manage lower-level roles)
 */
export function canManageRole(actorRole: RoleName, targetRole: RoleName): boolean {
    // SUPER_ADMIN can manage all roles
    if (actorRole === ROLES.SUPER_ADMIN) return true;
    // Cannot manage same or higher level roles
    return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get roles that a given role can assign to users
 */
export function getAssignableRoles(roleName: RoleName): RoleName[] {
    // SUPER_ADMIN can assign all roles
    if (roleName === ROLES.SUPER_ADMIN) {
        return Object.values(ROLES) as RoleName[];
    }
    const roleLevel = ROLE_HIERARCHY[roleName];
    return (Object.keys(ROLE_HIERARCHY) as RoleName[]).filter(
        (role) => ROLE_HIERARCHY[role] < roleLevel
    );
}
