import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { PermissionService, RoleService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";
import { db } from "$lib/server/db";
import { getAuditContext } from "$lib/server/utils/audit-context";

export const load: PageServerLoad = async ({ parent, params }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_READ)) {
        throw error(403, "You do not have permission to view roles");
    }

    // Get role with organization check
    const role = await RoleService.getWithPermissions(params.id, user.organizationId);

    if (!role) {
        throw error(404, "Role not found");
    }

    const permissions = await PermissionService.list();
    const selectedPermissionIds = role.permissions.map(
        (item: { permissionId: string }) => item.permissionId
    );

    return {
        role,
        permissions,
        selectedPermissionIds,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE),
        canDelete: !role.isSystem && role._count.users === 0
    };
};

export const actions: Actions = {
    update: async (event) => {
        const { params, request } = event;
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)) {
            throw error(403, "You do not have permission to update roles");
        }

        const formData = await request.formData();
        const displayName = formData.get("displayName")?.toString().trim();
        const description = formData.get("description")?.toString().trim() || null;

        if (!displayName) {
            throw error(400, "Display name is required");
        }

        await RoleService.update(
            params.id,
            { displayName, description },
            user.organizationId
        );

        return { success: true };
    },

    updatePermissions: async (event) => {
        const { params, request } = event;
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)) {
            throw error(403, "You do not have permission to update role permissions");
        }

        const formData = await request.formData();
        const permissionIds = formData
            .getAll("permissionIds")
            .map((value) => value.toString());

        // Get audit context
        const auditContext = getAuditContext(event, session);

        await PermissionService.updateRolePermissions(params.id, permissionIds, auditContext);

        return { success: true };
    },

    delete: async (event) => {
        const { params } = event;
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)) {
            throw error(403, "You do not have permission to delete roles");
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        await RoleService.delete(params.id, user.organizationId, auditContext);

        return { success: true };
    }
};
