import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth/password';
import type { RoleName } from '$lib/server/rbac/permissions';
import { logUserActivity, AUDIT_ACTIONS } from '$lib/server/utils/audit-logger';
import type { AuditContext } from '$lib/server/utils/audit-context';

// ============================================
// TYPES
// ============================================
export interface CreateUserInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
    organizationId: string | null;
    isActive?: boolean;
}

export interface UpdateUserInput {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    isActive?: boolean;
}

export interface UserFilters {
    organizationId?: string | null;
    roleId?: string;
    isActive?: boolean;
    search?: string;
    createdStartDate?: Date;
    createdEndDate?: Date;
    lastLoginStartDate?: Date;
    lastLoginEndDate?: Date;
}

export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt' | 'role';
    sortOrder?: 'asc' | 'desc';
}

export interface UserWithRole {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    organizationId: string | null;
    organization: {
        id: string;
        name: string;
        slug: string;
    } | null;
    role: {
        id: string;
        name: string;
        displayName: string;
    };
}

// ============================================
// USER SERVICE
// ============================================
export class UserService {
    /**
     * Create a new user
     */
    static async create(input: CreateUserInput, auditContext?: AuditContext): Promise<UserWithRole> {
        // Check if email already exists
        const existing = await db.user.findUnique({
            where: { email: input.email.toLowerCase() }
        });

        if (existing) {
            throw new Error('A user with this email already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(input.password);

        // Create user
        const user = await db.user.create({
            data: {
                email: input.email.toLowerCase(),
                passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
                roleId: input.roleId,
                organizationId: input.organizationId,
                isActive: input.isActive ?? true
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });

        // Log activity
        await logUserActivity(
            AUDIT_ACTIONS.CREATE,
            user.id,
            {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId,
                organizationId: user.organizationId
            },
            auditContext
        );

        return user;
    }

    /**
     * Get a user by ID
     */
    static async getById(id: string): Promise<UserWithRole | null> {
        return db.user.findUnique({
            where: { id },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });
    }

    /**
     * Get a user by email
     */
    static async getByEmail(email: string): Promise<UserWithRole | null> {
        return db.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });
    }

    /**
     * List users with filtering and pagination
     */
    static async list(
        filters: UserFilters = {},
        pagination: PaginationOptions = { page: 1, limit: 10 }
    ): Promise<{ users: UserWithRole[]; total: number; pages: number }> {
        const where: Record<string, unknown> = {};

        // Apply organization filter
        if (filters.organizationId !== undefined) {
            where.organizationId = filters.organizationId;
        }

        // Apply role filter
        if (filters.roleId) {
            where.roleId = filters.roleId;
        }

        // Apply active filter
        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        // Apply search filter
        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        // Apply created date range filter
        if (filters.createdStartDate || filters.createdEndDate) {
            where.createdAt = {};
            if (filters.createdStartDate) {
                where.createdAt = { ...where.createdAt as Record<string, unknown>, gte: filters.createdStartDate };
            }
            if (filters.createdEndDate) {
                where.createdAt = { ...where.createdAt as Record<string, unknown>, lte: filters.createdEndDate };
            }
        }

        // Apply last login date range filter
        if (filters.lastLoginStartDate || filters.lastLoginEndDate) {
            where.lastLoginAt = {};
            if (filters.lastLoginStartDate) {
                where.lastLoginAt = { ...where.lastLoginAt as Record<string, unknown>, gte: filters.lastLoginStartDate };
            }
            if (filters.lastLoginEndDate) {
                where.lastLoginAt = { ...where.lastLoginAt as Record<string, unknown>, lte: filters.lastLoginEndDate };
            }
        }

        // Get total count
        const total = await db.user.count({ where });

        // Build orderBy clause
        const sortBy = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder || 'desc';
        
        let orderBy: any = {};
        
        if (sortBy === 'role') {
            orderBy = { role: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        // Get paginated users
        const users = await (db as any).user.findMany({
            where,
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy,
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit
        });

        return {
            users,
            total,
            pages: Math.ceil(total / pagination.limit)
        };
    }

    /**
     * Update a user
     */
    static async update(
        id: string, 
        input: UpdateUserInput, 
        auditContext?: AuditContext,
        skipAuditLog?: boolean
    ): Promise<UserWithRole> {
        const data: Record<string, unknown> = {};

        if (input.email) {
            // Check if new email already exists
            const existing = await db.user.findFirst({
                where: {
                    email: input.email.toLowerCase(),
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('A user with this email already exists');
            }

            data.email = input.email.toLowerCase();
        }

        if (input.password) {
            data.passwordHash = await hashPassword(input.password);
        }

        if (input.firstName !== undefined) {
            data.firstName = input.firstName;
        }

        if (input.lastName !== undefined) {
            data.lastName = input.lastName;
        }

        if (input.roleId !== undefined) {
            data.roleId = input.roleId;
        }

        if (input.isActive !== undefined) {
            data.isActive = input.isActive;
        }

        const user = await db.user.update({
            where: { id },
            data,
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });

        // Log activity (skip if requested, e.g., when called from email change service)
        if (!skipAuditLog) {
            await logUserActivity(
                AUDIT_ACTIONS.UPDATE,
                user.id,
                {
                    changes: Object.keys(data),
                    email: user.email
                },
                auditContext
            );
        }

        return user;
    }

    /**
     * Delete a user
     */
    static async delete(id: string, auditContext?: AuditContext): Promise<void> {
        // Get user info before deletion for audit log
        const user = await db.user.findUnique({
            where: { id },
            select: { id: true, email: true, firstName: true, lastName: true }
        });

        await db.user.delete({ where: { id } });

        // Log activity
        if (user) {
            await logUserActivity(
                AUDIT_ACTIONS.DELETE,
                user.id,
                {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                auditContext
            );
        }
    }

    /**
     * Toggle user active status
     */
    static async toggleActive(id: string, auditContext?: AuditContext): Promise<UserWithRole> {
        const user = await db.user.findUnique({ where: { id } });

        if (!user) {
            throw new Error('User not found');
        }

        const updatedUser = await db.user.update({
            where: { id },
            data: { isActive: !user.isActive },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });

        // Log activity
        await logUserActivity(
            updatedUser.isActive ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
            updatedUser.id,
            {
                email: updatedUser.email,
                previousStatus: user.isActive,
                newStatus: updatedUser.isActive
            },
            auditContext
        );

        return updatedUser;
    }

    /**
     * Get user counts by role for an organization
     */
    static async getCountsByRole(organizationId?: string): Promise<Record<RoleName, number>> {
        const where = organizationId ? { organizationId } : {};

        const counts = await db.user.groupBy({
            by: ['roleId'],
            where,
            _count: true
        });

        const roles = await db.role.findMany({
            select: { id: true, name: true }
        });

        const result: Record<string, number> = {};

        for (const role of roles) {
            const count = counts.find((c: { roleId: string; _count: number }) => c.roleId === role.id);
            result[role.name] = count?._count ?? 0;
        }

        return result as Record<RoleName, number>;
    }
}
