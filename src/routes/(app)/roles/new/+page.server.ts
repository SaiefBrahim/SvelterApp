import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { PermissionService, RoleService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";
import { getAuditContext } from "$lib/server/utils/audit-context";

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)) {
        throw error(403, "You do not have permission to create roles");
    }

    const permissions = await PermissionService.list();

    return {
        permissions,
        user
    };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)) {
            throw error(403, "You do not have permission to create roles");
        }

        const formData = await request.formData();
        const name = formData.get("name")?.toString().trim().toUpperCase();
        const displayName = formData.get("displayName")?.toString().trim();
        const description = formData.get("description")?.toString().trim() || null;
        const level = parseInt(formData.get("level")?.toString() || "1");
        const permissionIds = formData.getAll("permissionIds").map((v) => v.toString());

        if (!name || !displayName) {
            throw error(400, "Name and display name are required");
        }

        if (level < 1 || level > 3) {
            throw error(400, "Level must be between 1 and 3");
        }

        // Check if user's role level is higher than the role being created
        const userRole = await RoleService.getByName(user.role, user.organizationId);
        if (!userRole || userRole.level <= level) {
            throw error(403, "You cannot create a role with equal or higher level than your own");
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        const role = await RoleService.create({
            name,
            displayName,
            description,
            level,
            organizationId: user.organizationId,
            permissionIds: permissionIds.length > 0 ? permissionIds : undefined
        }, auditContext);

        throw redirect(303, `/roles/${role.id}`);
    }
};
