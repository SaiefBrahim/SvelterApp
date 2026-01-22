import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
    InviteService,
    RoleService
} from "$lib/server/services";
import { PERMISSIONS, roleHasPermission, ROLES } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";
import { getAuditContext } from "$lib/server/utils/audit-context";

export const load: PageServerLoad = async ({ parent, url }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_READ)) {
        throw error(403, "You do not have permission to view invites");
    }

    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const organizationId = user.organizationId;

    const invites = await InviteService.list({
        organizationId,
        status: status as any,
        search
    });

    const roles = await RoleService.getSelectOptions(user.role as RoleName, user.organizationId);

    return {
        invites,
        roles,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE),
        defaultOrganizationId: user.organizationId
    };
};

export const actions: Actions = {
    create: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, "You do not have permission to create invites");
        }

        const formData = await event.request.formData();
        const email = formData.get("email")?.toString();
        const roleId = formData.get("roleId")?.toString();
        const organizationId = user.organizationId;

        if (!email || !roleId) {
            throw error(400, "Email and role are required");
        }

        const auditContext = getAuditContext(event, session);
        await InviteService.create({
            email,
            roleId,
            organizationId
        }, auditContext);

        return { success: true };
    },

    cancel: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, "You do not have permission to revoke invites");
        }

        const formData = await event.request.formData();
        const inviteId = formData.get("inviteId")?.toString();

        if (!inviteId) {
            throw error(400, "Invite ID is required");
        }

        const auditContext = getAuditContext(event, session);
        await InviteService.cancel(inviteId, auditContext);
        return { success: true };
    },

    resend: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, "You do not have permission to resend invites");
        }

        const formData = await event.request.formData();
        const inviteId = formData.get("inviteId")?.toString();

        if (!inviteId) {
            throw error(400, "Invite ID is required");
        }

        const auditContext = getAuditContext(event, session);
        await InviteService.resend(inviteId, undefined, auditContext);
        return { success: true };
    }
};
