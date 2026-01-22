import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { RoleService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";

export const load: PageServerLoad = async ({ parent, url }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_READ)) {
        throw error(403, "You do not have permission to view roles");
    }

    // Get query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const isSystem = url.searchParams.get('isSystem') 
        ? url.searchParams.get('isSystem') === 'true' 
        : undefined;
    const sortBy = (url.searchParams.get('sortBy') || 'level') as 'name' | 'displayName' | 'level' | 'createdAt' | 'users' | 'permissions';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Filter roles by organization (SUPER_ADMIN sees all)
    const { roles, total, pages } = await RoleService.listWithPagination(
        {
            organizationId: user.organizationId,
            search,
            isSystem
        },
        { 
            page, 
            limit,
            sortBy,
            sortOrder
        }
    );

    return {
        roles,
        total,
        pages,
        currentPage: page,
        limit,
        sortBy,
        sortOrder,
        filters: {
            search,
            isSystem
        },
        user,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.ROLES_MANAGE)
    };
};
