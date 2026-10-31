import { z } from 'zod';

export const AUTH_DIALOG_EVENT = 'habitthread:open-auth-dialog';

export const authDialogModeSchema = z.enum(['login', 'register']);
export type AuthDialogMode = z.infer<typeof authDialogModeSchema>;

export const openAuthDialog = (mode: AuthDialogMode): void => {
    window.dispatchEvent(
        new CustomEvent<AuthDialogMode>(AUTH_DIALOG_EVENT, { detail: mode }),
    );
};
