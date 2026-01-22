import { languageTag, setLanguageTag, availableLanguageTags } from "$lib/paraglide-adapter";
import { browser } from "$app/environment";

type Locale = "en" | "fr" | "ar";

// Supported languages for the application
export const SUPPORTED_LANGUAGES: readonly Locale[] = ["en", "fr", "ar"] as const;

/**
 * Normalize language code to our supported locales
 * Only supports: English (en), French (fr), Arabic (ar)
 */
function normalizeLanguageCode(lang: string): Locale {
    const normalized = lang.toLowerCase().split("-")[0];
    if (SUPPORTED_LANGUAGES.includes(normalized as Locale)) {
        return normalized as Locale;
    }
    return "en"; // Default to English
}

/**
 * Get browser language with fallback to English
 * Only returns supported languages: en, fr, ar
 */
function getBrowserLanguage(): Locale {
    if (!browser) return "en";
    
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const normalized = normalizeLanguageCode(browserLang);
    
    // If browser language is not supported, return English
    return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "en";
}

/**
 * Get locale from localStorage
 * Returns null if not found or not a supported language
 */
function getLocaleFromLocalStorage(): Locale | null {
    if (!browser) return null;
    
    try {
        const stored = localStorage.getItem("locale");
        if (stored && SUPPORTED_LANGUAGES.includes(stored as Locale)) {
            return stored as Locale;
        }
    } catch (e) {
        // localStorage might not be available
        console.warn("Failed to read from localStorage:", e);
    }
    
    return null;
}

/**
 * Save locale to localStorage and update cookie
 */
function saveLocaleToLocalStorage(locale: Locale): void {
    if (!browser) return;
    
    try {
        localStorage.setItem("locale", locale);
    } catch (e) {
        console.warn("Failed to save to localStorage:", e);
    }
}

/**
 * Simple manual i18n implementation
 */
export const i18n = {
    /**
     * Get the current locale
     */
    get locale(): Locale {
        return languageTag() as Locale;
    },

    /**
     * Resolve a route for a specific locale
     */
    resolveRoute(path: string, locale: Locale): string {
        return path || "/";
    },

    /**
     * Get current locale for user interface
     * Priority: localStorage > browser language (first visit only) > default (en)
     * 
     * Note: Organization language is NOT used for user interface.
     * It's only for document generation preferences.
     */
    getLocaleFromStorage(cookieValue?: string): Locale {
        // Client-side: check localStorage first (highest priority)
        if (browser) {
            const stored = getLocaleFromLocalStorage();
            
            // If localStorage has a value, always use it - never override with browser detection
            if (stored) {
                return stored;
            }
            
            // Only on first visit (no localStorage): detect and save browser language
            const browserLang = getBrowserLanguage();
            saveLocaleToLocalStorage(browserLang);
            
            return browserLang;
        }

        // Server-side: check cookie
        if (cookieValue && SUPPORTED_LANGUAGES.includes(cookieValue as Locale)) {
            return cookieValue as Locale;
        }

        // Server-side: default to English
        return "en";
    },

    /**
     * Save locale to both localStorage and cookie
     */
    saveLocale(locale: Locale): void {
        saveLocaleToLocalStorage(locale);
    },

    /**
     * Server-side handle for i18n
     * Uses cookie value, defaults to English
     */
    handle() {
        return async ({ event, resolve }: any) => {
            const locale = i18n.getLocaleFromStorage(
                event.cookies.get("locale") || undefined
            );
            
            setLanguageTag(locale);

            // Store locale in event.locals for easy access
            event.locals.locale = locale;

            return resolve(event);
        };
    },

    /**
     * Reroute logic for SvelteKit
     */
    reroute() {
        return ({ url }: { url: URL }) => {
            return url.pathname || "/";
        };
    }
};
