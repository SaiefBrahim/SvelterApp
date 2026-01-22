import { db } from '$lib/server/db';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { DEFAULT_ROLE_PERMISSIONS } from '$lib/server/rbac/permissions';
import type { Permission } from '$lib/server/rbac/permissions';
import { logOrganizationActivity, AUDIT_ACTIONS } from '$lib/server/utils/audit-logger';
import type { AuditContext } from '$lib/server/utils/audit-context';

// ============================================
// TYPES
// ============================================
export interface CreateOrganizationInput {
    name: string;
    slug: string;
    isActive?: boolean;
}

export interface UpdateOrganizationInput {
    name?: string;
    slug?: string;
    isActive?: boolean;
}

export interface OrganizationWithCounts {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        users: number;
    };
}

// ============================================
// ORGANIZATION SERVICE
// ============================================
export class OrganizationService {
    /**
     * Create a new organization
     */
    static async create(input: CreateOrganizationInput, auditContext?: AuditContext): Promise<OrganizationWithCounts> {
        // Validate and normalize slug
        const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        // Check if slug already exists
        const existing = await db.organization.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new Error('An organization with this slug already exists');
        }

        // Create organization in a transaction
        const organization = await db.$transaction(async (tx) => {
            // Create the organization
            const org = await tx.organization.create({
                data: {
                    name: input.name,
                    slug,
                    isActive: input.isActive ?? true
                }
            });

            // Create default organization settings
            await (tx as any).organizationSettings.create({
                data: {
                    organizationId: org.id,
                    currency: 'USD',
                    timezone: 'UTC',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: '24h',
                    language: 'en-US'
                }
            });

            // Create default roles for the organization
            const defaultRoles = RoleService.getDefaultRoles();
            const allPermissions = await PermissionService.list();
            
            // Create a map of permission string to ID
            const permissionMap = new Map<string, string>();
            for (const perm of allPermissions) {
                const key = `${perm.resource}:${perm.action}`;
                permissionMap.set(key, perm.id);
            }

            for (const roleDef of defaultRoles) {
                const role = await tx.role.create({
                    data: {
                        name: roleDef.name,
                        displayName: roleDef.displayName,
                        description: roleDef.description,
                        level: roleDef.level,
                        isSystem: roleDef.isSystem,
                        organizationId: org.id
                    } as any
                });

                // Assign default permissions to the role
                const rolePermissions = DEFAULT_ROLE_PERMISSIONS[roleDef.name as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
                if (rolePermissions.length > 0) {
                    const rolePermissionData = rolePermissions
                        .map((perm: Permission) => {
                            const permissionId = permissionMap.get(perm);
                            return permissionId ? { roleId: role.id, permissionId } : null;
                        })
                        .filter((item): item is { roleId: string; permissionId: string } => item !== null);

                    if (rolePermissionData.length > 0) {
                        await tx.rolePermission.createMany({
                            data: rolePermissionData
                        });
                    }
                }
            }

            return org;
        });

        // Return with counts
        const orgWithCounts = await db.organization.findUnique({
            where: { id: organization.id },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        }) as OrganizationWithCounts;

        // Log activity
        await logOrganizationActivity(
            AUDIT_ACTIONS.CREATE,
            orgWithCounts.id,
            {
                name: orgWithCounts.name,
                slug: orgWithCounts.slug
            },
            auditContext
        );

        return orgWithCounts;
    }

    /**
     * Get an organization by ID
     */
    static async getById(id: string): Promise<OrganizationWithCounts | null> {
        return db.organization.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }

    /**
     * Get an organization by slug
     */
    static async getBySlug(slug: string): Promise<OrganizationWithCounts | null> {
        return db.organization.findUnique({
            where: { slug: slug.toLowerCase() },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }

    /**
     * List all organizations
     */
    static async list(
        filters: { isActive?: boolean; search?: string } = {},
        pagination = { page: 1, limit: 10 }
    ): Promise<{ organizations: OrganizationWithCounts[]; total: number; pages: number }> {
        const where: Record<string, unknown> = {};

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { slug: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        const total = await db.organization.count({ where });

        const organizations = await db.organization.findMany({
            where,
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit
        });

        return {
            organizations,
            total,
            pages: Math.ceil(total / pagination.limit)
        };
    }

    /**
     * Update an organization
     */
    static async update(id: string, input: UpdateOrganizationInput, auditContext?: AuditContext): Promise<OrganizationWithCounts> {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }

        if (input.slug !== undefined) {
            const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

            // Check if new slug already exists
            const existing = await db.organization.findFirst({
                where: {
                    slug,
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('An organization with this slug already exists');
            }

            data.slug = slug;
        }

        if (input.isActive !== undefined) {
            data.isActive = input.isActive;
        }

        const organization = await db.organization.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        // Log activity
        await logOrganizationActivity(
            AUDIT_ACTIONS.UPDATE,
            organization.id,
            {
                changes: Object.keys(data),
                name: organization.name
            },
            auditContext
        );

        return organization;
    }

    /**
     * Delete an organization (and all associated users)
     */
    static async delete(id: string, auditContext?: AuditContext): Promise<void> {
        // Get organization info before deletion for audit log
        const organization = await db.organization.findUnique({
            where: { id },
            select: { id: true, name: true, slug: true }
        });

        await db.organization.delete({ where: { id } });

        // Log activity
        if (organization) {
            await logOrganizationActivity(
                AUDIT_ACTIONS.DELETE,
                organization.id,
                {
                    name: organization.name,
                    slug: organization.slug
                },
                auditContext
            );
        }
    }

    /**
     * Toggle organization active status
     */
    static async toggleActive(id: string, auditContext?: AuditContext): Promise<OrganizationWithCounts> {
        const organization = await db.organization.findUnique({ where: { id } });

        if (!organization) {
            throw new Error('Organization not found');
        }

        const updatedOrg = await db.organization.update({
            where: { id },
            data: { isActive: !organization.isActive },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        // Log activity
        await logOrganizationActivity(
            updatedOrg.isActive ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
            updatedOrg.id,
            {
                name: updatedOrg.name,
                previousStatus: organization.isActive,
                newStatus: updatedOrg.isActive
            },
            auditContext
        );

        return updatedOrg;
    }

    /**
     * Get all organizations for dropdown selection
     */
    static async getSelectOptions(): Promise<{ id: string; name: string; slug: string }[]> {
        return db.organization.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                slug: true
            },
            orderBy: { name: 'asc' }
        });
    }
}
