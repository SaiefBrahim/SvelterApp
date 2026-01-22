import { db } from "$lib/server/db";
import type { TaxIdentifier } from "../types/organization-settings";
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from "../utils/audit-logger";
import type { AuditContext } from "../utils/audit-context";

export interface CreateTaxIdentifierInput {
    organizationSettingsId: string;
    type: string;
    value: string;
    label: string;
    taxRate?: number | null;
}

export interface UpdateTaxIdentifierInput {
    type?: string;
    value?: string;
    label?: string;
    taxRate?: number | null;
    isActive?: boolean;
}

export class TaxIdentifierService {
    /**
     * Create a new tax identifier
     */
    static async create(
        input: CreateTaxIdentifierInput,
        auditContext?: AuditContext
    ): Promise<TaxIdentifier> {
        const taxIdentifier = await (db as any).taxIdentifier.create({
            data: {
                organizationSettingsId: input.organizationSettingsId,
                type: input.type,
                value: input.value,
                label: input.label,
                taxRate: input.taxRate ?? null,
                isActive: true
            }
        });

        // Log activity
        await logActivity(
            {
                action: AUDIT_ACTIONS.CREATE,
                resource: AUDIT_RESOURCES.ORGANIZATION_SETTINGS,
                resourceId: input.organizationSettingsId,
                metadata: {
                    taxIdentifierId: taxIdentifier.id,
                    type: input.type,
                    value: input.value
                }
            },
            auditContext
        );

        return taxIdentifier as TaxIdentifier;
    }

    /**
     * Update a tax identifier
     */
    static async update(
        id: string,
        input: UpdateTaxIdentifierInput,
        auditContext?: AuditContext
    ): Promise<TaxIdentifier> {
        const taxIdentifier = await (db as any).taxIdentifier.update({
            where: { id },
            data: input
        });

        // Log activity
        await logActivity(
            {
                action: AUDIT_ACTIONS.UPDATE,
                resource: AUDIT_RESOURCES.ORGANIZATION_SETTINGS,
                resourceId: taxIdentifier.organizationSettingsId,
                metadata: {
                    taxIdentifierId: id,
                    changes: Object.keys(input)
                }
            },
            auditContext
        );

        return taxIdentifier as TaxIdentifier;
    }

    /**
     * Delete (soft delete) a tax identifier
     */
    static async delete(
        id: string,
        auditContext?: AuditContext
    ): Promise<TaxIdentifier> {
        const taxIdentifier = await (db as any).taxIdentifier.update({
            where: { id },
            data: { isActive: false }
        });

        // Log activity
        await logActivity(
            {
                action: AUDIT_ACTIONS.DELETE,
                resource: AUDIT_RESOURCES.ORGANIZATION_SETTINGS,
                resourceId: taxIdentifier.organizationSettingsId,
                metadata: {
                    taxIdentifierId: id,
                    type: taxIdentifier.type,
                    value: taxIdentifier.value
                }
            },
            auditContext
        );

        return taxIdentifier as TaxIdentifier;
    }

    /**
     * Get all active tax identifiers for an organization
     */
    static async getByOrganizationSettingsId(
        organizationSettingsId: string
    ): Promise<TaxIdentifier[]> {
        const taxIdentifiers = await (db as any).taxIdentifier.findMany({
            where: {
                organizationSettingsId,
                isActive: true
            },
            orderBy: { createdAt: 'asc' }
        });

        return taxIdentifiers as TaxIdentifier[];
    }
}
