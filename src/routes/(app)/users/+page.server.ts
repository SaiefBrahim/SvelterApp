import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { UserService, InviteService, RoleService } from '$lib/server/services';
import { ROLES, PERMISSIONS, roleHasPermission } from '$lib/server/rbac';
import type { RoleName } from '$lib/server/rbac/permissions';
import { getAuditContext } from '$lib/server/utils/audit-context';

export const load: PageServerLoad = async ({ parent, url }) => {
    const { user } = await parent();

    // Check permission
    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_READ)) {
        throw error(403, 'You do not have permission to view users');
    }

    // Get query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const roleId = url.searchParams.get('roleId') || undefined;
    const isActive = url.searchParams.get('isActive') 
        ? url.searchParams.get('isActive') === 'true' 
        : undefined;
    const sortBy = (url.searchParams.get('sortBy') || 'createdAt') as 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt' | 'role';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const tab = url.searchParams.get('tab') || 'users';

    // Always filter by user's organization
    const organizationId = user.organizationId;

    // Get users
    const { users, total, pages } = await UserService.list(
        {
            organizationId,
            roleId,
            search,
            isActive
        },
        { 
            page, 
            limit,
            sortBy,
            sortOrder
        }
    );

    // Get invites if on invites tab
    const invitePage = tab === 'invites' ? parseInt(url.searchParams.get('invitePage') || '1') : 1;
    const inviteLimit = tab === 'invites' ? parseInt(url.searchParams.get('inviteLimit') || '10') : 10;
    const inviteSearch = tab === 'invites' ? url.searchParams.get('inviteSearch') || undefined : undefined;
    const inviteStatus = tab === 'invites' ? (url.searchParams.get('inviteStatus') as any) : undefined;
    const inviteRoleId = tab === 'invites' ? url.searchParams.get('inviteRoleId') || undefined : undefined;
    const inviteSortBy = tab === 'invites' ? (url.searchParams.get('inviteSortBy') || 'createdAt') as 'email' | 'status' | 'createdAt' | 'expiresAt' | 'role' : 'createdAt';
    const inviteSortOrder = tab === 'invites' ? (url.searchParams.get('inviteSortOrder') || 'desc') as 'asc' | 'desc' : 'desc';

    const inviteResult = tab === 'invites'
        ? await InviteService.listWithPagination(
            {
                organizationId,
                status: inviteStatus,
                search: inviteSearch,
                roleId: inviteRoleId
            },
            {
                page: invitePage,
                limit: inviteLimit,
                sortBy: inviteSortBy,
                sortOrder: inviteSortOrder
            }
        )
        : { invites: [], total: 0, pages: 0 };

    // Get roles for filter and invite creation
    const roles = await RoleService.getSelectOptions(user.role as RoleName, user.organizationId);

    return {
        users,
        total,
        pages,
        currentPage: page,
        limit,
        sortBy,
        sortOrder,
        filters: {
            search,
            roleId,
            isActive
        },
        roles,
        invites: inviteResult.invites,
        inviteTotal: inviteResult.total,
        invitePages: inviteResult.pages,
        inviteCurrentPage: invitePage,
        inviteLimit,
        inviteSortBy,
        inviteSortOrder,
        inviteFilters: {
            search: inviteSearch,
            status: inviteStatus,
            roleId: inviteRoleId
        },
        tab,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_MANAGE),
        canManageInvites: roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)
    };
};

export const actions: Actions = {
    createInvite: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, 'You do not have permission to create invites');
        }

        const formData = await event.request.formData();
        const email = formData.get('email')?.toString();
        const roleId = formData.get('roleId')?.toString();
        const organizationId = user.organizationId;

        if (!email || !roleId) {
            throw error(400, 'Email and role are required');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        await InviteService.create({
            email,
            roleId,
            organizationId
        }, auditContext);

        return { success: true };
    },

    cancelInvite: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, 'You do not have permission to revoke invites');
        }

        const formData = await event.request.formData();
        const inviteId = formData.get('inviteId')?.toString();

        if (!inviteId) {
            throw error(400, 'Invite ID is required');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        await InviteService.cancel(inviteId, auditContext);
        return { success: true };
    },

    resendInvite: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.INVITES_MANAGE)) {
            throw error(403, 'You do not have permission to resend invites');
        }

        const formData = await event.request.formData();
        const inviteId = formData.get('inviteId')?.toString();

        if (!inviteId) {
            throw error(400, 'Invite ID is required');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        await InviteService.resend(inviteId, undefined, auditContext);
        return { success: true };
    },

    delete: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_DELETE)) {
            throw error(403, 'You do not have permission to delete users');
        }

        const formData = await event.request.formData();
        const userId = formData.get('userId')?.toString();

        if (!userId) {
            throw error(400, 'User ID is required');
        }

        // Prevent self-deletion
        if (userId === user.id) {
            throw error(400, 'You cannot delete your own account');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await UserService.delete(userId, auditContext);
            return { success: true };
        } catch (err) {
            console.error('Error deleting user:', err);
            throw error(500, 'Failed to delete user');
        }
    },

    toggleActive: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.USERS_UPDATE)) {
            throw error(403, 'You do not have permission to update users');
        }

        const formData = await event.request.formData();
        const userId = formData.get('userId')?.toString();

        if (!userId) {
            throw error(400, 'User ID is required');
        }

        // Prevent toggling self
        if (userId === user.id) {
            throw error(400, 'You cannot disable your own account');
        }

        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await UserService.toggleActive(userId, auditContext);
            return { success: true };
        } catch (err) {
            console.error('Error toggling user status:', err);
            throw error(500, 'Failed to update user status');
        }
    }
};
