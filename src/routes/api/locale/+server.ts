import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { availableLanguageTags } from "$lib/paraglide-adapter";

export const POST: RequestHandler = async ({ request, cookies }) => {
    const body = await request.json().catch(() => ({}));
    const locale = typeof body?.locale === "string" ? body.locale : "en";

    if (!availableLanguageTags.includes(locale as any)) {
        return json({ error: "Unsupported locale" }, { status: 400 });
    }

    // Save to cookie (for server-side access)
    cookies.set("locale", locale, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365
    });

    // Note: localStorage is handled client-side in the language switcher component
    // This ensures it works even if the API call fails

    return new Response(null, { status: 204 });
};
