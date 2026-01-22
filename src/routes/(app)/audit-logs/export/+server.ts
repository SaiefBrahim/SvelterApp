import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AuditLogService } from "$lib/server/services";
import { PERMISSIONS, roleHasPermission } from "$lib/server/rbac";
import type { RoleName } from "$lib/server/rbac/permissions";

export const GET: RequestHandler = async (event) => {
    const { url } = event;
    const session = await event.locals.auth?.();
    if (!session?.user) {
        throw error(401, "Unauthorized");
    }
    const user = session.user as any;

    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.AUDIT_LOGS_READ)) {
        throw error(403, "You do not have permission to export audit logs");
    }

    const format = url.searchParams.get("format") || "csv";
    const resource = url.searchParams.get("resource") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const startDate = url.searchParams.get("startDate") 
        ? new Date(url.searchParams.get("startDate")!) 
        : undefined;
    const endDate = url.searchParams.get("endDate")
        ? new Date(url.searchParams.get("endDate")!)
        : undefined;

    if (format === "csv") {
        const csv = await AuditLogService.exportCSV({
            organizationId: user.organizationId ?? undefined,
            resource,
            action,
            search,
            startDate,
            endDate
        });

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    } else if (format === "json") {
        const json = await AuditLogService.exportJSON({
            organizationId: user.organizationId ?? undefined,
            resource,
            action,
            search,
            startDate,
            endDate
        });

        return new Response(json, {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } else {
        throw error(400, "Invalid format. Use 'csv' or 'json'");
    }
};
