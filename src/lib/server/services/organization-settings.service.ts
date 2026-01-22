import { db } from "$lib/server/db";
import type {
    OrganizationSettings,
    UpdateSettingsInput,
    CurrencyFormatOptions
} from "../types/organization-settings";
import { DEFAULT_SETTINGS } from "../types/organization-settings";
import { validateSettings } from "../utils/settings-validation";
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from "../utils/audit-logger";
import type { AuditContext } from "../utils/audit-context";

// In-memory cache for settings
const settingsCache = new Map<string, OrganizationSettings>();

export class OrganizationSettingsService {
    /**
     * Get organization settings (with optional caching)
     */
    static async getSettings(
        organizationId: string,
        useCache: boolean = true
    ): Promise<OrganizationSettings | null> {
        const cacheKey = `org_settings_${organizationId}`;

        if (useCache && settingsCache.has(cacheKey)) {
            return settingsCache.get(cacheKey)!;
        }

        const settings = await (db as any).organizationSettings.findUnique({
            where: { organizationId },
            include: {
                taxIdentifiers: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (settings && useCache) {
            settingsCache.set(cacheKey, settings as OrganizationSettings);
        }

        return settings as OrganizationSettings | null;
    }

    /**
     * Update organization settings
     */
    static async updateSettings(
        organizationId: string,
        input: UpdateSettingsInput,
        strict: boolean = true,
        auditContext?: AuditContext
    ): Promise<OrganizationSettings> {
        // Validate settings
        const validation = validateSettings(input as Record<string, unknown>, strict);
        if (!validation.valid) {
            throw new Error(`Invalid settings: ${validation.errors.join(", ")}`);
        }

        const settings = await (db as any).organizationSettings.update({
            where: { organizationId },
            data: input,
            include: {
                taxIdentifiers: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        // Invalidate cache
        const cacheKey = `org_settings_${organizationId}`;
        settingsCache.delete(cacheKey);

        // Log activity
        await logActivity(
            {
                action: AUDIT_ACTIONS.UPDATE,
                resource: AUDIT_RESOURCES.ORGANIZATION_SETTINGS,
                resourceId: settings.id,
                metadata: {
                    organizationId,
                    changes: Object.keys(input)
                }
            },
            auditContext
        );

        return settings as OrganizationSettings;
    }

    /**
     * Get default settings
     */
    static getDefaultSettings(): typeof DEFAULT_SETTINGS {
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Format currency based on organization settings
     */
    static async formatCurrency(
        amount: number,
        organizationId: string,
        options?: CurrencyFormatOptions
    ): Promise<string> {
        const settings = await this.getSettings(organizationId);
        const currency = settings?.currency || "USD";

        // Use Intl.NumberFormat as primary method
        const formatter = new Intl.NumberFormat(
            settings?.language || "en-US",
            {
                style: "currency",
                currency: currency,
                minimumFractionDigits: options?.decimalPlaces ?? 2,
                maximumFractionDigits: options?.decimalPlaces ?? 2,
                useGrouping: options?.useGrouping ?? true
            }
        );

        let formatted = formatter.format(amount);

        // Apply custom overrides if provided
        if (options?.symbol) {
            const symbol = options.symbol;
            const position = options.symbolPosition || "before";
            const numericPart = formatted.replace(/[^\d.,-]/g, "");

            if (position === "before") {
                formatted = `${symbol}${numericPart}`;
            } else {
                formatted = `${numericPart}${symbol}`;
            }
        }

        return formatted;
    }

    /**
     * Format date based on organization settings
     */
    static async formatDate(
        date: Date,
        organizationId: string
    ): Promise<string> {
        const settings = await this.getSettings(organizationId);
        const format = settings?.dateFormat || "YYYY-MM-DD";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        switch (format) {
            case "MM/DD/YYYY":
                return `${month}/${day}/${year}`;
            case "DD/MM/YYYY":
                return `${day}/${month}/${year}`;
            case "YYYY-MM-DD":
                return `${year}-${month}-${day}`;
            case "DD.MM.YYYY":
                return `${day}.${month}.${year}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    /**
     * Format time based on organization settings
     */
    static async formatTime(
        date: Date,
        organizationId: string
    ): Promise<string> {
        const settings = await this.getSettings(organizationId);
        const format = settings?.timeFormat || "24h";

        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        if (format === "12h") {
            const period = hours >= 12 ? "PM" : "AM";
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${period}`;
        } else {
            return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
        }
    }

    /**
     * Get timezone string for organization
     */
    static async getTimezone(organizationId: string): Promise<string> {
        const settings = await this.getSettings(organizationId);
        return settings?.timezone || "UTC";
    }

    /**
     * Convert date to organization's timezone
     */
    static async convertToOrganizationTimezone(
        date: Date,
        organizationId: string
    ): Promise<Date> {
        const settings = await this.getSettings(organizationId);
        const timezone = settings?.timezone || "UTC";

        // Create a date string in the target timezone
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });

        const parts = formatter.formatToParts(date);
        const year = parseInt(parts.find(p => p.type === "year")!.value);
        const month = parseInt(parts.find(p => p.type === "month")!.value) - 1;
        const day = parseInt(parts.find(p => p.type === "day")!.value);
        const hour = parseInt(parts.find(p => p.type === "hour")!.value);
        const minute = parseInt(parts.find(p => p.type === "minute")!.value);
        const second = parseInt(parts.find(p => p.type === "second")!.value);

        return new Date(year, month, day, hour, minute, second);
    }

    /**
     * Invalidate cache for an organization
     */
    static invalidateCache(organizationId: string): void {
        const cacheKey = `org_settings_${organizationId}`;
        settingsCache.delete(cacheKey);
    }
}
