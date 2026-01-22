import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { AuditLogService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";

export const load: PageServerLoad = async ({ parent, url }) => {
    const { user } = await parent();

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.AUDIT_LOGS_READ)) {
        throw error(403, "You do not have permission to view audit logs");
    }

    const resource = url.searchParams.get("resource") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const sortBy = (url.searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'action' | 'resource' | 'user';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Date range
    const startDate = url.searchParams.get("startDate") 
        ? new Date(url.searchParams.get("startDate")!) 
        : undefined;
    const endDate = url.searchParams.get("endDate")
        ? new Date(url.searchParams.get("endDate")!)
        : undefined;

    const organizationId = user.organizationId;

    const result = await AuditLogService.list({
        organizationId,
        resource,
        action,
        search,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder
    });

    return {
        ...result,
        currentPage: result.page,
        sortBy,
        sortOrder,
        filters: {
            resource,
            action,
            search,
            startDate: startDate?.toISOString().split('T')[0],
            endDate: endDate?.toISOString().split('T')[0]
        }
    };
};

