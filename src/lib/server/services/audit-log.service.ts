import { db } from "$lib/server/db";

export interface AuditLogRecord {
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    userId: string | null;
    organizationId: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    } | null;
}

export interface CreateAuditLogInput {
    action: string;
    resource: string;
    resourceId?: string | null;
    userId?: string | null;
    organizationId?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export interface ListAuditLogsOptions {
    organizationId?: string | null;
    resource?: string;
    action?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'action' | 'resource' | 'user';
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAuditLogs {
    logs: AuditLogRecord[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export class AuditLogService {
    /**
     * Create a new audit log entry
     */
    static async create(input: CreateAuditLogInput): Promise<void> {
        await db.auditLog.create({
            data: {
                action: input.action,
                resource: input.resource,
                resourceId: input.resourceId ?? null,
                userId: input.userId ?? null,
                organizationId: input.organizationId ?? null,
                metadata: input.metadata ? (input.metadata as any) : null,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null
            }
        });
    }

    /**
     * List audit logs with pagination and filtering
     */
    static async list(options: ListAuditLogsOptions = {}): Promise<PaginatedAuditLogs> {
        const {
            organizationId,
            resource,
            action,
            search,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const where: Record<string, unknown> = {};

        if (organizationId !== undefined) {
            where.organizationId = organizationId ?? undefined;
        }

        if (resource) {
            where.resource = resource;
        }

        if (action) {
            where.action = action;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt = { ...where.createdAt as Record<string, unknown>, gte: startDate };
            }
            if (endDate) {
                where.createdAt = { ...where.createdAt as Record<string, unknown>, lte: endDate };
            }
        }

        if (search) {
            where.OR = [
                { resourceId: { contains: search, mode: "insensitive" } },
                { resource: { contains: search, mode: "insensitive" } },
                { action: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } }
            ];
        }

        const total = await db.auditLog.count({ where });

        // Build orderBy clause
        let orderBy: any = {};
        
        if (sortBy === 'user') {
            orderBy = { user: { email: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const logs = await db.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit
        });

        return {
            logs: logs.map((log: any) => ({
                ...log,
                metadata: log.metadata as Record<string, unknown> | null
            })) as AuditLogRecord[],
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Export audit logs as CSV
     */
    static async exportCSV(options: ListAuditLogsOptions = {}): Promise<string> {
        const { logs } = await this.list({ ...options, limit: 10000 }); // Large limit for export

        const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'User', 'Email', 'IP Address', 'User Agent'];
        const rows = logs.map(log => [
            log.createdAt.toISOString(),
            log.action,
            log.resource,
            log.resourceId || '',
            log.user ? `${log.user.firstName} ${log.user.lastName}` : '',
            log.user?.email || '',
            log.ipAddress || '',
            log.userAgent || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return csv;
    }

    /**
     * Export audit logs as JSON
     */
    static async exportJSON(options: ListAuditLogsOptions = {}): Promise<string> {
        const { logs } = await this.list({ ...options, limit: 10000 }); // Large limit for export

        return JSON.stringify(logs, null, 2);
    }
}
