import { useMemo } from "react";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useEditUser, type User } from "@tryghost/admin-x-framework/api/users";

export interface EmberBridge {
    state: StateBridge;
}

export interface StateBridge {
    on: (event: string, callback: (value: boolean) => void) => void;
    off: (event: string, callback: (value: boolean) => void) => void;
    onUpdate: (...args: unknown[]) => void;
    onInvalidate: (...args: unknown[]) => void;
    onDelete: (...args: unknown[]) => void;
}

declare global {
    interface Window {
        EmberBridge?: EmberBridge;
    }
}

export const useParsedCurrentUser = () => {
    const result = useCurrentUser();

    const data = useMemo<(Omit<User, 'accessibility'> & {accessibility: Record<string, unknown> | null} )| null>(() => {
        const user = result.data ?? null;
        return user ? {
            ...user,
            accessibility: user.accessibility ? JSON.parse(user.accessibility) as Record<string, unknown> : null
        } : null;
    }, [result.data]);

    return {
        ...result,
        data
    };
}

export function useToggleDarkMode(): [boolean, () => Promise<void>] {
    const { mutateAsync: updateUserAccessibilityState } = useEditUser()
    const { data: currentUser } = useParsedCurrentUser();

    const accessibility = currentUser?.accessibility ?? {};
    const nightShift = typeof accessibility.nightShift === 'boolean' ? accessibility.nightShift : false;

    const toggleDarkMode = async () => {
        if (!currentUser) {
            return;
        }

        await updateUserAccessibilityState({
            ...currentUser,
            accessibility: JSON.stringify({
                ...currentUser.accessibility,
                nightShift: !nightShift
            })
        });
    }

    return [nightShift, toggleDarkMode];
}
