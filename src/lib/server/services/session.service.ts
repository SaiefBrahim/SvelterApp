import { db } from "$lib/server/db";

export interface SessionWithUser {
    id: string;
    sessionToken: string;
    expires: Date;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        organizationId: string | null;
        role: {
            id: string;
            name: string;
            displayName: string;
        };
    };
}

export interface SessionFilters {
    organizationId?: string | null;
    search?: string;
    roleId?: string;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: 'expires' | 'createdAt' | 'user';
    sortOrder?: 'asc' | 'desc';
}

export class SessionService {
    /**
     * List sessions (deprecated - use listWithPagination)
     */
    static async list(options: {
        organizationId?: string | null;
        search?: string;
        limit?: number;
    } = {}): Promise<SessionWithUser[]> {
        const { organizationId, search, limit = 50 } = options;

        return db.session.findMany({
            where: {
                user: {
                    organizationId: organizationId ?? undefined,
                    OR: search
                        ? [
                              { email: { contains: search, mode: "insensitive" } },
                              { firstName: { contains: search, mode: "insensitive" } },
                              { lastName: { contains: search, mode: "insensitive" } }
                          ]
                        : undefined
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        organizationId: true,
                        role: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true
                            }
                        }
                    }
                }
            },
            orderBy: { expires: "desc" },
            take: limit
        });
    }

    /**
     * List sessions with pagination, filtering, and sorting
     */
    static async listWithPagination(
        filters: SessionFilters = {},
        pagination: PaginationOptions = { page: 1, limit: 10 }
    ): Promise<{ sessions: SessionWithUser[]; total: number; pages: number }> {
        const where: any = {
            user: {
                organizationId: filters.organizationId ?? undefined
            }
        };

        // Apply role filter
        if (filters.roleId) {
            where.user.roleId = filters.roleId;
        }

        // Apply search filter
        if (filters.search) {
            where.user.OR = [
                { email: { contains: filters.search, mode: "insensitive" } },
                { firstName: { contains: filters.search, mode: "insensitive" } },
                { lastName: { contains: filters.search, mode: "insensitive" } }
            ];
        }

        // Get total count
        const total = await db.session.count({ where });

        // Build orderBy clause
        const sortBy = pagination.sortBy || 'expires';
        const sortOrder = pagination.sortOrder || 'desc';
        
        let orderBy: any = {};
        
        if (sortBy === 'user') {
            orderBy = { user: { firstName: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        // Get paginated sessions
        const sessions = await db.session.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        organizationId: true,
                        role: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true
                            }
                        }
                    }
                }
            },
            orderBy,
            skip: (pagination.page! - 1) * pagination.limit!,
            take: pagination.limit!
        }) as SessionWithUser[];

        return {
            sessions,
            total,
            pages: Math.ceil(total / pagination.limit!)
        };
    }

    static async revoke(sessionId: string): Promise<void> {
        await db.session.delete({ where: { id: sessionId } });
    }
}
