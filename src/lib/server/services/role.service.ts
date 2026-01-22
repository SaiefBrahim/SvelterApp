import { db } from '$lib/server/db';
import type { RoleName } from '$lib/server/rbac/permissions';
import { ROLES } from '$lib/server/rbac/permissions';
import { logRoleActivity, AUDIT_ACTIONS } from '$lib/server/utils/audit-logger';
import type { AuditContext } from '$lib/server/utils/audit-context';

// ============================================
// TYPES
// ============================================
export interface RoleWithPermissionCount {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    level: number;
    isSystem: boolean;
    organizationId: string | null;
    createdAt: Date;
    _count: {
        users: number;
        permissions: number;
    };
}

export interface CreateRoleInput {
    name: string;
    displayName: string;
    description?: string | null;
    level: number;
    organizationId: string | null;
    permissionIds?: string[];
}

export interface UpdateRoleInput {
    displayName?: string;
    description?: string | null;
    level?: number;
}

export interface RoleFilters {
    organizationId?: string | null;
    search?: string;
    isSystem?: boolean;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'displayName' | 'level' | 'createdAt' | 'users' | 'permissions';
    sortOrder?: 'asc' | 'desc';
}

// ============================================
// ROLE SERVICE
// ============================================
export class RoleService {
    /**
     * Get all roles (filtered by organization if provided)
     * @deprecated Use listWithPagination instead
     */
    static async list(organizationId?: string | null): Promise<RoleWithPermissionCount[]> {
        const where: any = {};
        
        // If organizationId is provided, filter by it (null for SUPER_ADMIN/system roles)
        if (organizationId !== undefined) {
            where.organizationId = organizationId;
        }

        return db.role.findMany({
            where,
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            },
            orderBy: { level: 'desc' }
        }) as Promise<RoleWithPermissionCount[]>;
    }

    /**
     * List roles with pagination, filtering, and sorting
     */
    static async listWithPagination(
        filters: RoleFilters = {},
        pagination: PaginationOptions = { page: 1, limit: 10 }
    ): Promise<{ roles: RoleWithPermissionCount[]; total: number; pages: number }> {
        const where: any = {};
        
        // Apply organization filter
        if (filters.organizationId !== undefined) {
            where.organizationId = filters.organizationId;
        }

        // Apply system role filter
        if (filters.isSystem !== undefined) {
            where.isSystem = filters.isSystem;
        }

        // Apply search filter
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { displayName: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        // Get total count
        const total = await db.role.count({ where });

        // Build orderBy clause
        const sortBy = pagination.sortBy || 'level';
        const sortOrder = pagination.sortOrder || 'desc';
        
        let orderBy: any = {};
        
        if (sortBy === 'users' || sortBy === 'permissions') {
            // For count-based sorting, we need to sort after fetching
            orderBy = { level: sortOrder };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        // Get paginated roles
        const roles = await db.role.findMany({
            where,
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            },
            orderBy,
            skip: (pagination.page! - 1) * pagination.limit!,
            take: pagination.limit!
        }) as RoleWithPermissionCount[];

        // Sort by count if needed (client-side for now, could be optimized with raw query)
        if (sortBy === 'users' || sortBy === 'permissions') {
            roles.sort((a, b) => {
                const aCount = sortBy === 'users' ? a._count.users : a._count.permissions;
                const bCount = sortBy === 'users' ? b._count.users : b._count.permissions;
                return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
            });
        }

        return {
            roles,
            total,
            pages: Math.ceil(total / pagination.limit!)
        };
    }

    /**
     * Get a role by ID (with optional organization check)
     */
    static async getById(id: string, organizationId?: string | null): Promise<RoleWithPermissionCount | null> {
        const role = await db.role.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            }
        }) as any;

        if (!role) return null;

        // If organizationId is provided, verify ownership (unless SUPER_ADMIN role)
        if (organizationId !== undefined && role.organizationId !== organizationId && role.name !== ROLES.SUPER_ADMIN) {
            return null;
        }

        return role as RoleWithPermissionCount;
    }

    /**
     * Get a role by name and organization
     */
    static async getByName(name: string, organizationId: string | null): Promise<RoleWithPermissionCount | null> {
        const role = await db.role.findFirst({
            where: {
                name,
                organizationId: organizationId ?? null
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            }
        });
        return role as RoleWithPermissionCount | null;
    }

    /**
     * Get roles available for assignment
     */
    static async getAssignableRoles(callerRole: RoleName): Promise<RoleWithPermissionCount[]> {
        const roles = await db.role.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            },
            orderBy: { level: 'desc' }
        });

        // Get caller's role level
        const callerLevel = roles.find((r: RoleWithPermissionCount) => r.name === callerRole)?.level ?? 0;

        // Only return roles with lower level
        return roles.filter((r: RoleWithPermissionCount) => r.level < callerLevel);
    }

    /**
     * Get roles for dropdown selection (filtered by organization)
     * Users can assign any role from their organization, including their own role
     */
    static async getSelectOptions(
        callerRole?: RoleName,
        organizationId?: string | null
    ): Promise<{ id: string; name: string; displayName: string }[]> {
        const where: any = {};
        
        // Filter by organization if provided
        if (organizationId !== undefined) {
            where.organizationId = organizationId;
        }

        const roles = await db.role.findMany({
            where,
            select: {
                id: true,
                name: true,
                displayName: true,
                level: true
            },
            orderBy: { level: 'desc' }
        }) as any[];

        // Return all roles from the organization (users can assign any role, including their own)
        return roles.map(({ id, name, displayName }: { id: string; name: string; displayName: string }) => ({
            id,
            name,
            displayName
        }));
    }

    /**
     * Get role with all permissions (with optional organization check)
     */
    static async getWithPermissions(id: string, organizationId?: string | null) {
        const role = await db.role.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                },
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        }) as any;

        if (!role) return null;

        // If organizationId is provided, verify ownership (unless SUPER_ADMIN role)
        if (organizationId !== undefined && role.organizationId !== organizationId && role.name !== ROLES.SUPER_ADMIN) {
            return null;
        }

        return role;
    }

    /**
     * Create a new role
     */
    static async create(input: CreateRoleInput, auditContext?: AuditContext): Promise<RoleWithPermissionCount> {
        // Check if role name already exists in this organization
        const existing = await this.getByName(input.name, input.organizationId);
        if (existing) {
            throw new Error('A role with this name already exists in this organization');
        }

        // Create the role
        const role = await db.role.create({
            data: {
                name: input.name,
                displayName: input.displayName,
                description: input.description || null,
                level: input.level,
                organizationId: input.organizationId ?? null,
                isSystem: false
            } as any,
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            }
        }) as RoleWithPermissionCount;

        // Assign permissions if provided
        if (input.permissionIds && input.permissionIds.length > 0) {
            await db.rolePermission.createMany({
                data: input.permissionIds.map((permissionId) => ({
                    roleId: role.id,
                    permissionId
                }))
            });
        }

        return role;
    }

    /**
     * Update a role
     */
    static async update(id: string, input: UpdateRoleInput, organizationId?: string | null, auditContext?: AuditContext): Promise<RoleWithPermissionCount> {
        // Verify organization ownership
        const existing = await this.getById(id, organizationId);
        if (!existing) {
            throw new Error('Role not found or you do not have permission to update it');
        }

        // Cannot update system roles (except SUPER_ADMIN which is handled separately)
        if (existing.isSystem && existing.name !== ROLES.SUPER_ADMIN) {
            throw new Error('Cannot update system roles');
        }

        return db.role.update({
            where: { id },
            data: {
                displayName: input.displayName,
                description: input.description,
                level: input.level
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            }
        }) as Promise<RoleWithPermissionCount>;
    }

    /**
     * Delete a role
     */
    static async delete(id: string, organizationId?: string | null, auditContext?: AuditContext): Promise<void> {
        // Verify organization ownership
        const existing = await this.getById(id, organizationId);
        if (!existing) {
            throw new Error('Role not found or you do not have permission to delete it');
        }

        // Cannot delete system roles
        if (existing.isSystem) {
            throw new Error('Cannot delete system roles');
        }

        // Cannot delete if users are assigned
        if (existing._count.users > 0) {
            throw new Error('Cannot delete role that has users assigned');
        }

        await db.role.delete({
            where: { id }
        });

        // Log activity
        await logRoleActivity(
            AUDIT_ACTIONS.DELETE,
            existing.id,
            {
                name: existing.name,
                displayName: existing.displayName,
                organizationId: existing.organizationId
            },
            auditContext
        );
    }

    /**
     * Get default role definitions for an organization
     */
    static getDefaultRoles(): Array<{ name: string; displayName: string; description: string; level: number; isSystem: boolean }> {
        return [
            {
                name: 'ADMIN',
                displayName: 'Administrator',
                description: 'Organization administrator with full access within their organization',
                level: 3,
                isSystem: true
            },
            {
                name: 'MANAGER',
                displayName: 'Manager',
                description: 'Organization manager with operational access',
                level: 2,
                isSystem: true
            },
            {
                name: 'OPERATOR',
                displayName: 'Operator',
                description: 'Organization operator with limited access',
                level: 1,
                isSystem: true
            }
        ];
    }
}
