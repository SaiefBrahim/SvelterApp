import { signOut } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async (event) => {
        return await signOut(event);
    }
};
