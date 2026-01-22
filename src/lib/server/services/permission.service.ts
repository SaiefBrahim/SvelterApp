import { db } from "$lib/server/db";
import { logRoleActivity, AUDIT_ACTIONS } from "../utils/audit-logger";
import type { AuditContext } from "../utils/audit-context";

export interface PermissionRecord {
    id: string;
    resource: string;
    action: string;
    description: string | null;
}

export interface RolePermissionRecord {
    roleId: string;
    permissionId: string;
    permission: PermissionRecord;
}

export class PermissionService {
    static async list(): Promise<PermissionRecord[]> {
        return (db.permission.findMany as any)({
            orderBy: [{ resource: "asc" }, { action: "asc" }]
        });
    }

    static async listByRole(roleId: string): Promise<RolePermissionRecord[]> {
        return (db.rolePermission.findMany as any)({
            where: { roleId },
            include: { permission: true }
        });
    }

    static async updateRolePermissions(
        roleId: string,
        permissionIds: string[],
        auditContext?: AuditContext
    ): Promise<void> {
        // Get role info before update for audit log
        const role = await (db.role.findUnique as any)({
            where: { id: roleId },
            select: { id: true, name: true, displayName: true, organizationId: true }
        });

        await (db.rolePermission.deleteMany as any)({ where: { roleId } });

        if (permissionIds.length > 0) {
            await (db.rolePermission.createMany as any)({
                data: permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId
                }))
            });
        }

        // Log activity
        if (role) {
            await logRoleActivity(
                AUDIT_ACTIONS.UPDATE,
                role.id,
                {
                    name: role.name,
                    permissionCount: permissionIds.length,
                    action: 'permissions_updated'
                },
                auditContext
            );
        }
    }
}
