import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
    const session = await event.locals.auth?.();

    // Allow invite acceptance and email change confirmation routes even if logged in
    const isInviteAcceptRoute = event.url.pathname.startsWith('/invites/accept/');
    const isEmailChangeConfirmRoute = event.url.pathname.startsWith('/confirm-email-change/');

    // If already logged in, redirect to dashboard (except for special routes)
    if (session?.user && !isInviteAcceptRoute && !isEmailChangeConfirmRoute) {
        throw redirect(303, '/dashboard');
    }

    return {};
};
