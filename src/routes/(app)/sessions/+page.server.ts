import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { SessionService, RoleService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission, ROLES } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";

export const load: PageServerLoad = async ({ parent, url }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.SESSIONS_READ)) {
        throw error(403, "You do not have permission to view sessions");
    }

    // Get query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const roleId = url.searchParams.get('roleId') || undefined;
    const sortBy = (url.searchParams.get('sortBy') || 'expires') as 'expires' | 'createdAt' | 'user';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const organizationId = user.organizationId;

    const { sessions, total, pages } = await SessionService.listWithPagination(
        {
            organizationId,
            search,
            roleId
        },
        { 
            page, 
            limit,
            sortBy,
            sortOrder
        }
    );

    // Get roles for filter
    const roles = await RoleService.getSelectOptions(user.role as RoleName, user.organizationId);

    return {
        sessions,
        total,
        pages,
        currentPage: page,
        limit,
        sortBy,
        sortOrder,
        filters: {
            search,
            roleId
        },
        roles,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.SESSIONS_MANAGE)
    };
};

export const actions: Actions = {
    revoke: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, "Unauthorized");
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.SESSIONS_MANAGE)) {
            throw error(403, "You do not have permission to revoke sessions");
        }

        const formData = await event.request.formData();
        const sessionId = formData.get("sessionId")?.toString();

        if (!sessionId) {
            throw error(400, "Session ID is required");
        }

        await SessionService.revoke(sessionId);
        return { success: true };
    }
};
