import { db } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createUserSchema } from '$lib/utils/validation';
import type { PageServerLoad, Actions } from './$types';
import { RoleService, UserService } from '$lib/server/services';
import { PERMISSIONS, roleHasPermission, canAssignRole } from '$lib/server/rbac';
import type { RoleName } from '$lib/server/rbac/permissions';
import type { AuthSession } from '$lib/server/rbac/guards';
import { getAuditContext } from '$lib/server/utils/audit-context';

export const load: PageServerLoad = async ({ params, parent }) => {
    const { user } = await parent();

    // Check permission
    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_READ)) {
        throw error(403, 'You do not have permission to view users');
    }

    const targetUser = await db.user.findUnique({
        where: { id: params.id },
        include: {
            role: true,
            organization: true
        }
    });

    if (!targetUser) {
        throw error(404, 'User not found');
    }

    // Check organization access (unless SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN' && targetUser.organizationId !== user.organizationId) {
        throw error(403, 'You do not have access to this user');
    }

    // Get roles that this user can assign
    const roles = await RoleService.getSelectOptions(user.role as RoleName, user.organizationId);

    return {
        targetUser: {
            id: targetUser.id,
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            roleId: targetUser.roleId,
            isActive: targetUser.isActive,
            organizationId: targetUser.organizationId
        },
        roles,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_MANAGE),
        canDelete: roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_DELETE)
    };
};

export const actions: Actions = {
    update: async (event) => {
        const { params, request } = event;
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;

        // Check permission
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_MANAGE)) {
            throw error(403, 'You do not have permission to update users');
        }

        const formData = await request.formData();
        const firstName = formData.get('firstName')?.toString();
        const lastName = formData.get('lastName')?.toString();
        const email = formData.get('email')?.toString();
        const roleId = formData.get('roleId')?.toString();
        const isActive = formData.get('isActive') === 'true';

        if (!firstName || !lastName || !email || !roleId) {
            return fail(400, { error: 'Missing required fields' });
        }

        // Get target user to check organization access
        const targetUser = await db.user.findUnique({
            where: { id: params.id },
            include: { role: true }
        });

        if (!targetUser) {
            throw error(404, 'User not found');
        }

        // Check organization access (unless SUPER_ADMIN)
        if (user.role !== 'SUPER_ADMIN' && targetUser.organizationId !== user.organizationId) {
            throw error(403, 'You do not have access to this user');
        }

        // Check if user can assign this role
        const targetRole = await RoleService.getById(roleId, user.organizationId);
        if (!targetRole) {
            return fail(400, { error: 'Invalid role selected' });
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
            return fail(403, { error: 'You cannot assign this role' });
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await UserService.update(params.id, {
                firstName,
                lastName,
                email: email.toLowerCase(),
                roleId,
                isActive
            }, auditContext);
        } catch (err: any) {
            return fail(500, { error: err.message || 'Failed to update user' });
        }

        throw redirect(303, '/users');
    },

    delete: async (event) => {
        const { params, locals } = event;
        const session = await locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user;

        // Check permission
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_DELETE)) {
            throw error(403, 'You do not have permission to delete users');
        }

        // Get target user to check organization access
        const targetUser = await db.user.findUnique({
            where: { id: params.id }
        });

        if (!targetUser) {
            throw error(404, 'User not found');
        }

        // Check organization access (unless SUPER_ADMIN)
        if (user.role !== 'SUPER_ADMIN' && targetUser.organizationId !== user.organizationId) {
            throw error(403, 'You do not have access to this user');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await UserService.delete(params.id, auditContext);
        } catch (err: any) {
            return fail(500, { error: err.message || 'Failed to delete user' });
        }

        throw redirect(303, '/users');
    }
};
