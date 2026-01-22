import { ALLOWED_DATE_FORMATS, ALLOWED_TIME_FORMATS } from "../types/organization-settings";

// ISO 4217 currency codes (common ones)
const VALID_CURRENCY_CODES = new Set([
    "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "BRL",
    "ZAR", "MXN", "SGD", "HKD", "NOK", "SEK", "DKK", "PLN", "RUB", "TRY"
]);

// Common IANA timezone identifiers
const VALID_TIMEZONES = new Set([
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Phoenix", "America/Anchorage", "America/Honolulu", "Europe/London",
    "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam",
    "Europe/Stockholm", "Europe/Vienna", "Europe/Zurich", "Asia/Tokyo", "Asia/Shanghai",
    "Asia/Hong_Kong", "Asia/Singapore", "Asia/Dubai", "Asia/Kolkata", "Australia/Sydney",
    "Australia/Melbourne", "Pacific/Auckland"
]);

// BCP 47 language tags (common ones)
const VALID_LANGUAGES = new Set([
    "en-US", "en-GB", "en-CA", "en-AU", "fr-FR", "fr-CA", "de-DE", "es-ES",
    "es-MX", "it-IT", "pt-BR", "pt-PT", "nl-NL", "sv-SE", "da-DK", "no-NO",
    "fi-FI", "pl-PL", "ru-RU", "ja-JP", "zh-CN", "zh-TW", "ko-KR", "ar-SA",
    "hi-IN", "tr-TR"
]);

export function validateCurrency(code: string, strict: boolean = true): boolean {
    if (!code || typeof code !== "string") return false;
    if (strict) {
        return VALID_CURRENCY_CODES.has(code.toUpperCase());
    }
    // Basic validation: 3 uppercase letters
    return /^[A-Z]{3}$/.test(code);
}

export function validateTimezone(tz: string, strict: boolean = true): boolean {
    if (!tz || typeof tz !== "string") return false;
    if (strict) {
        return VALID_TIMEZONES.has(tz);
    }
    // Basic validation: non-empty string
    return tz.trim().length > 0;
}

export function validateDateFormat(format: string): boolean {
    if (!format || typeof format !== "string") return false;
    return ALLOWED_DATE_FORMATS.includes(format as any);
}

export function validateTimeFormat(format: string): boolean {
    if (!format || typeof format !== "string") return false;
    return ALLOWED_TIME_FORMATS.includes(format as any);
}

export function validateEmail(email: string | null | undefined): boolean {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateLanguage(locale: string, strict: boolean = true): boolean {
    if (!locale || typeof locale !== "string") return false;
    if (strict) {
        return VALID_LANGUAGES.has(locale);
    }
    // Basic validation: language-country format
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(locale);
}

export function validateSettings(
    input: Record<string, unknown>,
    strict: boolean = true
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.currency !== undefined && !validateCurrency(String(input.currency), strict)) {
        errors.push("Invalid currency code");
    }

    if (input.timezone !== undefined && !validateTimezone(String(input.timezone), strict)) {
        errors.push("Invalid timezone");
    }

    if (input.dateFormat !== undefined && !validateDateFormat(String(input.dateFormat))) {
        errors.push("Invalid date format");
    }

    if (input.timeFormat !== undefined && !validateTimeFormat(String(input.timeFormat))) {
        errors.push("Invalid time format (must be '12h' or '24h')");
    }

    if (input.language !== undefined && !validateLanguage(String(input.language), strict)) {
        errors.push("Invalid language/locale");
    }

    if (input.email !== undefined && input.email !== null && !validateEmail(String(input.email))) {
        errors.push("Invalid email format");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
