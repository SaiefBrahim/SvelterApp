import * as runtime from "./paraglide/runtime.js";

type Locale = "en" | "fr" | "ar";

/**
 * Direct re-exports from Paraglide v1 runtime
 */
export const languageTag = runtime.languageTag;
export const setLanguageTag = runtime.setLanguageTag;
export const onSetLanguageTag = runtime.onSetLanguageTag;
export const isAvailableLanguageTag = runtime.isAvailableLanguageTag;
export const availableLanguageTags = runtime.availableLanguageTags as readonly Locale[];
export const sourceLanguageTag = runtime.sourceLanguageTag as Locale;

// Aliases for compatibility
export const getLocale = runtime.languageTag;
export const setLocale = runtime.setLanguageTag;
export const locales = runtime.availableLanguageTags as readonly Locale[];
export const baseLocale = runtime.sourceLanguageTag as Locale;
