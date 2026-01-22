import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { ROLES } from '$lib/server/rbac/permissions';

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    // Get organization-scoped stats
    const [userCount, sessionCount] = await Promise.all([
        db.user.count({
            where: { organizationId: user.organizationId }
        }),
        db.session.count({
            where: {
                expires: { gt: new Date() },
                user: { organizationId: user.organizationId }
            }
        })
    ]);

    const roleCount = await db.role.count();

    return {
        stats: {
            totalUsers: userCount,
            totalRoles: roleCount,
            activeSessions: sessionCount
        }
    };
};
