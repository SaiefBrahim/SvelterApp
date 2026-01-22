import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createUserSchema, type CreateUserSchema } from '$lib/utils/validation';
import { UserService, RoleService } from '$lib/server/services';
import { PERMISSIONS, roleHasPermission, canAssignRole } from '$lib/server/rbac';
import { type SuperValidated, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { RoleName } from '$lib/server/rbac/permissions';
import type { AuthSession } from '$lib/server/rbac/guards';
import { getAuditContext } from '$lib/server/utils/audit-context';

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    // Check permission
    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_CREATE)) {
        throw error(403, 'You do not have permission to create users');
    }

    // Get roles that this user can assign
    const roles = await RoleService.getSelectOptions(user.role as RoleName, user.organizationId);

    // Initialize form
    const form = await superValidate(zod(createUserSchema as any) as any) as SuperValidated<CreateUserSchema>;

    return {
        form,
        roles
    };
};

export const actions: Actions = {
    default: async (event) => {
        // Get session from locals
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user;
        const { request } = event;

        // Check permission
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_CREATE)) {
            throw error(403, 'You do not have permission to create users');
        }

        const form = await superValidate(request, zod(createUserSchema as any) as any) as SuperValidated<CreateUserSchema>;

        if (!form.valid) {
            return fail(400, { form });
        }

        if ((form.data as any).password !== (form.data as any).confirmPassword) {
            setError(form, 'confirmPassword', 'Passwords do not match');
            return fail(400, { form });
        }

        // Check if user can assign this role
        const targetRole = await RoleService.getById((form.data as any).roleId, user.organizationId);
        if (!targetRole) {
            return fail(400, {
                form,
                error: 'Invalid role selected'
            });
        }

        // Check role assignment permission
        const mockSession = {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role as RoleName,
                organizationId: user.organizationId,
                isActive: true
            }
        } as AuthSession;

        if (!canAssignRole(mockSession, targetRole.name as RoleName)) {
            return fail(403, {
                form,
                error: 'You cannot assign this role'
            });
        }

        // Always use current user's organization
        const organizationId = user.organizationId;

        const { email, password, firstName, lastName, roleId, isActive } = form.data as any;

        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await UserService.create({
                email,
                password,
                firstName,
                lastName,
                roleId,
                organizationId,
                isActive
            }, auditContext);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create user';
            return fail(400, {
                form,
                error: message
            });
        }

        throw redirect(303, '/users');
    }
};
