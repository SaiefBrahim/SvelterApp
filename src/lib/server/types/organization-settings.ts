export interface TaxIdentifier {
    id: string;
    type: string;
    value: string;
    label: string;
    taxRate: number | null;
    isActive: boolean;
    organizationSettingsId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationSettings {
    id: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
    addressStreet: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressPostalCode: string | null;
    addressCountry: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    taxIdentifiers?: TaxIdentifier[];
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSettingsInput {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    language?: string;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPostalCode?: string | null;
    addressCountry?: string | null;
    phone?: string | null;
    email?: string | null;
    logo?: string | null;
}

export interface CurrencyFormatOptions {
    symbol?: string;
    symbolPosition?: "before" | "after";
    decimalPlaces?: number;
    useGrouping?: boolean;
}

export const DEFAULT_SETTINGS: Omit<OrganizationSettings, "id" | "organizationId" | "createdAt" | "updatedAt"> = {
    currency: "USD",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    language: "en-US",
    addressStreet: null,
    addressCity: null,
    addressState: null,
    addressPostalCode: null,
    addressCountry: null,
    phone: null,
    email: null,
    logo: null
};

export const ALLOWED_DATE_FORMATS = [
    "MM/DD/YYYY",
    "DD/MM/YYYY",
    "YYYY-MM-DD",
    "DD.MM.YYYY"
] as const;

export type DateFormat = typeof ALLOWED_DATE_FORMATS[number];

export const ALLOWED_TIME_FORMATS = ["12h", "24h"] as const;

export type TimeFormat = typeof ALLOWED_TIME_FORMATS[number];
