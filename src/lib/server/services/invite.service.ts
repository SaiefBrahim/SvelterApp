import { db } from "$lib/server/db";
import crypto from "crypto";
import { UserService } from "./user.service";
import bcrypt from "bcryptjs";
import { EmailService } from "./email.service";
import { logInviteActivity, AUDIT_ACTIONS } from "$lib/server/utils/audit-logger";
import type { AuditContext } from "$lib/server/utils/audit-context";

export type InviteStatus = "PENDING" | "ACCEPTED" | "CANCELED" | "EXPIRED";

export interface InviteRecord {
    id: string;
    email: string;
    roleId: string;
    organizationId: string | null;
    status: InviteStatus;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    role: {
        id: string;
        name: string;
        displayName: string;
    };
    organization: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export class InviteService {
    /**
     * Check and mark expired invites
     */
    static async checkExpiredInvites(): Promise<void> {
        await (db as any).invite.updateMany({
            where: {
                status: "PENDING",
                expiresAt: { lt: new Date() }
            },
            data: { status: "EXPIRED" }
        });
    }

    /**
     * List invites (deprecated - use listWithPagination)
     */
    static async list(options: {
        organizationId?: string | null;
        status?: InviteStatus;
        search?: string;
    } = {}): Promise<InviteRecord[]> {
        const { organizationId, status, search } = options;

        // Auto-check expired invites before listing
        await this.checkExpiredInvites();

        const invites = await db.invite.findMany({
            where: {
                organizationId: organizationId ?? undefined,
                status: status ?? undefined,
                OR: search
                    ? [{ email: { contains: search, mode: "insensitive" } }]
                    : undefined
            },
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return invites.map(invite => ({
            ...invite,
            status: invite.status as InviteStatus
        })) as InviteRecord[];
    }

    /**
     * List invites with pagination, filtering, and sorting
     */
    static async listWithPagination(
        filters: {
            organizationId?: string | null;
            status?: InviteStatus;
            search?: string;
            roleId?: string;
        } = {},
        pagination: {
            page?: number;
            limit?: number;
            sortBy?: 'email' | 'status' | 'createdAt' | 'expiresAt' | 'role';
            sortOrder?: 'asc' | 'desc';
        } = { page: 1, limit: 10 }
    ): Promise<{ invites: InviteRecord[]; total: number; pages: number }> {
        // Auto-check expired invites before listing
        await this.checkExpiredInvites();

        const where: any = {
            organizationId: filters.organizationId ?? undefined,
            status: filters.status ?? undefined
        };

        // Apply role filter
        if (filters.roleId) {
            where.roleId = filters.roleId;
        }

        // Apply search filter
        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: "insensitive" } }
            ];
        }

        // Get total count
        const total = await db.invite.count({ where });

        // Build orderBy clause
        const sortBy = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder || 'desc';
        
        let orderBy: any = {};
        
        if (sortBy === 'role') {
            orderBy = { role: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        // Get paginated invites
        const invites = await db.invite.findMany({
            where,
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy,
            skip: (pagination.page! - 1) * pagination.limit!,
            take: pagination.limit!
        });

        return {
            invites: invites.map(invite => ({
                ...invite,
                status: invite.status as InviteStatus
            })) as InviteRecord[],
            total,
            pages: Math.ceil(total / pagination.limit!)
        };
    }

    static async create(
        input: {
            email: string;
            roleId: string;
            organizationId: string | null;
            expiresInDays?: number;
        },
        auditContext?: AuditContext
    ): Promise<InviteRecord> {
        const expiresAt = new Date(
            Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000
        );

        const invite = await (db as any).invite.create({
            data: {
                email: input.email.toLowerCase(),
                roleId: input.roleId,
                organizationId: input.organizationId,
                token: crypto.randomUUID(),
                status: "PENDING",
                expiresAt
            },
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        const inviteRecord = {
            ...invite,
            status: invite.status as InviteStatus
        } as InviteRecord;

        // Send invite email (URL will be constructed when sending)
        // Note: We'll pass the token and let the email service construct the full URL
        try {
            await EmailService.sendInviteEmail(
                invite.email,
                invite.token,
                invite.role.displayName,
                invite.organization?.name
            );
        } catch (error) {
            console.error('Failed to send invite email:', error);
            // Don't throw - invite is created, email failure is logged
        }

        // Log activity
        await logInviteActivity(
            AUDIT_ACTIONS.CREATE,
            invite.id,
            {
                email: invite.email,
                roleId: invite.roleId,
                organizationId: invite.organizationId
            },
            auditContext
        );

        return inviteRecord;
    }

    static async cancel(id: string, auditContext?: AuditContext): Promise<void> {
        // Get invite info before cancellation for audit log
        const invite = await (db as any).invite.findUnique({
            where: { id },
            select: { id: true, email: true, organizationId: true }
        });

        await (db as any).invite.update({
            where: { id },
            data: { status: "CANCELED" }
        });

        // Log activity
        if (invite) {
            await logInviteActivity(
                AUDIT_ACTIONS.CANCEL,
                invite.id,
                {
                    email: invite.email,
                    organizationId: invite.organizationId
                },
                auditContext
            );
        }
    }

    /**
     * Get invite by token
     */
    static async getByToken(token: string): Promise<InviteRecord | null> {
        // Check expired invites first
        await this.checkExpiredInvites();

        const invite = await (db as any).invite.findUnique({
            where: { token },
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        if (!invite) return null;

        // Check if expired
        if (invite.expiresAt < new Date() && invite.status === "PENDING") {
            await (db as any).invite.update({
                where: { id: invite.id },
                data: { status: "EXPIRED" }
            });
            return null;
        }

        return {
            ...invite,
            status: invite.status as InviteStatus
        } as InviteRecord;
    }

    /**
     * Get invite by email
     */
    static async getByEmail(email: string, organizationId?: string | null): Promise<InviteRecord | null> {
        await this.checkExpiredInvites();

        const invite = await (db as any).invite.findFirst({
            where: {
                email: email.toLowerCase(),
                organizationId: organizationId ?? undefined,
                status: "PENDING"
            },
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        if (!invite) return null;
        return {
            ...invite,
            status: invite.status as InviteStatus
        } as InviteRecord;
    }

    /**
     * Resend an invite (creates new token and extends expiration)
     */
    static async resend(id: string, expiresInDays?: number, auditContext?: AuditContext): Promise<InviteRecord> {
        const existingInvite = await (db as any).invite.findUnique({ where: { id } });

        if (!existingInvite) {
            throw new Error("Invite not found");
        }

        if (existingInvite.status !== "PENDING") {
            throw new Error("Can only resend pending invites");
        }

        const expiresAt = new Date(
            Date.now() + (expiresInDays ?? 7) * 24 * 60 * 60 * 1000
        );

        const invite = await (db as any).invite.update({
            where: { id },
            data: {
                token: crypto.randomUUID(),
                expiresAt,
                status: "PENDING"
            },
            include: {
                role: {
                    select: { id: true, name: true, displayName: true }
                },
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        const inviteRecord = {
            ...invite,
            status: invite.status as InviteStatus
        } as InviteRecord;

        // Send invite email
        try {
            await EmailService.sendInviteEmail(
                invite.email,
                invite.token,
                invite.role.displayName,
                invite.organization?.name
            );
        } catch (error) {
            console.error('Failed to send invite email:', error);
            // Don't throw - invite is updated, email failure is logged
        }

        return inviteRecord;
    }

    /**
     * Accept an invite and create user account
     */
    static async accept(
        token: string,
        userData: {
            firstName: string;
            lastName: string;
            password: string;
        },
        auditContext?: AuditContext
    ): Promise<{ success: boolean; userId: string }> {
        const invite = await this.getByToken(token);

        if (!invite) {
            throw new Error("Invalid or expired invite");
        }

        if (invite.status !== "PENDING") {
            throw new Error("Invite has already been used or canceled");
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: invite.email }
        });

        if (existingUser) {
            // Update existing user with invite details
            await db.user.update({
                where: { id: existingUser.id },
                data: {
                    roleId: invite.roleId,
                    organizationId: invite.organizationId,
                    passwordHash: await bcrypt.hash(userData.password, 12)
                }
            });

            // Mark invite as accepted
            await (db as any).invite.update({
                where: { id: invite.id },
                data: { status: "ACCEPTED" }
            });

            // Log activity
            await logInviteActivity(
                AUDIT_ACTIONS.ACCEPT,
                invite.id,
                { email: invite.email, userId: existingUser.id },
                auditContext
            );

            return { success: true, userId: existingUser.id };
        }

        // Create new user
        const passwordHash = await bcrypt.hash(userData.password, 12);

        const user = await db.user.create({
            data: {
                email: invite.email,
                passwordHash,
                firstName: userData.firstName,
                lastName: userData.lastName,
                roleId: invite.roleId,
                organizationId: invite.organizationId,
                isActive: true
            }
        });

        // Mark invite as accepted
        await (db as any).invite.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
        });

        // Log activity
        await logInviteActivity(
            AUDIT_ACTIONS.ACCEPT,
            invite.id,
            { email: invite.email, userId: user.id },
            auditContext
        );

        return { success: true, userId: user.id };
    }
}
