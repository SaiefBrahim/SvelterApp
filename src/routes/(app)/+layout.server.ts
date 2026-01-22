import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { RoleName } from '$lib/server/rbac/permissions';

export const load: LayoutServerLoad = async (event) => {
    const session = await event.locals.auth?.();

    // Require authentication for all app routes
    if (!session?.user) {
        throw redirect(303, '/login');
    }

    // Type assertion - we know user exists after the check above
    const user = session.user;

    // Check if user is active
    if (!user.isActive) {
        throw redirect(303, '/login?error=AccountDisabled');
    }

    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role as RoleName,
            organizationId: user.organizationId
        }
    };
};
