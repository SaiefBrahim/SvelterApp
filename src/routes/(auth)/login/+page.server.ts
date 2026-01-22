import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { signIn } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
    login: async (event) => {
        try {
            return await signIn(event);
        } catch (error) {
            if (isRedirect(error)) {
                throw error;
            }

            console.error('Login action error:', error);
            return fail(401, {
                error: 'Invalid email or password'
            });
        }
    }
};
