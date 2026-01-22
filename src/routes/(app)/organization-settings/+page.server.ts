import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { OrganizationSettingsService, TaxIdentifierService } from '$lib/server/services';
import { PERMISSIONS, roleHasPermission } from '$lib/server/rbac';
import type { RoleName } from '$lib/server/rbac/permissions';
import { getAuditContext } from '$lib/server/utils/audit-context';
import { ALLOWED_DATE_FORMATS, ALLOWED_TIME_FORMATS } from '$lib/server/types/organization-settings';

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    // Check permission
    if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_READ)) {
        throw error(403, 'You do not have permission to view organization settings');
    }

    if (!user.organizationId) {
        throw error(400, 'You must belong to an organization to view settings');
    }

    // Get current settings
    const settings = await OrganizationSettingsService.getSettings(user.organizationId);

    return {
        settings,
        canManage: roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_MANAGE),
        dateFormats: ALLOWED_DATE_FORMATS,
        timeFormats: ALLOWED_TIME_FORMATS
    };
};

export const actions: Actions = {
    update: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any; // Type assertion since we know user exists

        // Check permission
        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE)) {
            throw error(403, 'You do not have permission to update organization settings');
        }

        if (!user.organizationId) {
            throw error(400, 'You must belong to an organization to update settings');
        }

        const formData = await event.request.formData();

        // Build update input
        const updateInput: Record<string, unknown> = {};

        // Basic settings
        if (formData.has('currency')) updateInput.currency = formData.get('currency')?.toString();
        if (formData.has('timezone')) updateInput.timezone = formData.get('timezone')?.toString();
        if (formData.has('dateFormat')) updateInput.dateFormat = formData.get('dateFormat')?.toString();
        if (formData.has('timeFormat')) updateInput.timeFormat = formData.get('timeFormat')?.toString();
        if (formData.has('language')) updateInput.language = formData.get('language')?.toString();

        // Address fields
        if (formData.has('addressStreet')) {
            const value = formData.get('addressStreet')?.toString();
            updateInput.addressStreet = value === '' ? null : value;
        }
        if (formData.has('addressCity')) {
            const value = formData.get('addressCity')?.toString();
            updateInput.addressCity = value === '' ? null : value;
        }
        if (formData.has('addressState')) {
            const value = formData.get('addressState')?.toString();
            updateInput.addressState = value === '' ? null : value;
        }
        if (formData.has('addressPostalCode')) {
            const value = formData.get('addressPostalCode')?.toString();
            updateInput.addressPostalCode = value === '' ? null : value;
        }
        if (formData.has('addressCountry')) {
            const value = formData.get('addressCountry')?.toString();
            updateInput.addressCountry = value === '' ? null : value;
        }

        // Contact fields
        if (formData.has('phone')) {
            const value = formData.get('phone')?.toString();
            updateInput.phone = value === '' ? null : value;
        }
        if (formData.has('email')) {
            const value = formData.get('email')?.toString();
            updateInput.email = value === '' ? null : value;
        }
        // Get audit context
        const auditContext = getAuditContext(event, session);

        try {
            await OrganizationSettingsService.updateSettings(
                user.organizationId,
                updateInput as any,
                true, // strict validation
                auditContext
            );

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update settings';
            return { success: false, error: message };
        }
    },

    createTaxIdentifier: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;

        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE)) {
            throw error(403, 'You do not have permission to update organization settings');
        }

        if (!user.organizationId) {
            throw error(400, 'You must belong to an organization');
        }

        const formData = await event.request.formData();
        const settings = await OrganizationSettingsService.getSettings(user.organizationId);
        
        if (!settings) {
            throw error(404, 'Organization settings not found');
        }

        const type = formData.get('type')?.toString();
        const value = formData.get('value')?.toString();
        const label = formData.get('label')?.toString();
        const taxRateStr = formData.get('taxRate')?.toString();
        const taxRate = taxRateStr ? parseFloat(taxRateStr) : null;

        if (!type || !value || !label) {
            return { success: false, error: 'Type, value, and label are required' };
        }

        const auditContext = getAuditContext(event, session);

        try {
            await TaxIdentifierService.create({
                organizationSettingsId: settings.id,
                type,
                value,
                label,
                taxRate
            }, auditContext);

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create tax identifier';
            return { success: false, error: message };
        }
    },

    updateTaxIdentifier: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;

        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE)) {
            throw error(403, 'You do not have permission to update organization settings');
        }

        if (!user.organizationId) {
            throw error(400, 'You must belong to an organization');
        }

        const formData = await event.request.formData();
        const id = formData.get('id')?.toString();

        if (!id) {
            return { success: false, error: 'Tax identifier ID is required' };
        }

        const updateData: any = {};
        if (formData.has('type')) updateData.type = formData.get('type')?.toString();
        if (formData.has('value')) updateData.value = formData.get('value')?.toString();
        if (formData.has('label')) updateData.label = formData.get('label')?.toString();
        if (formData.has('taxRate')) {
            const taxRateStr = formData.get('taxRate')?.toString();
            updateData.taxRate = taxRateStr ? parseFloat(taxRateStr) : null;
        }

        const auditContext = getAuditContext(event, session);

        try {
            await TaxIdentifierService.update(id, updateData, auditContext);
            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update tax identifier';
            return { success: false, error: message };
        }
    },

    deleteTaxIdentifier: async (event) => {
        const session = await event.locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }

        const user = session.user as any;

        if (!roleHasPermission(user.role as RoleName, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE)) {
            throw error(403, 'You do not have permission to update organization settings');
        }

        const formData = await event.request.formData();
        const id = formData.get('id')?.toString();

        if (!id) {
            return { success: false, error: 'Tax identifier ID is required' };
        }

        const auditContext = getAuditContext(event, session);

        try {
            await TaxIdentifierService.delete(id, auditContext);
            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete tax identifier';
            return { success: false, error: message };
        }
    }
};
