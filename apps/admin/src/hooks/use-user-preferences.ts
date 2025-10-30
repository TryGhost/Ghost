import { useCallback, useEffect, useRef } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useQueryClient } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useEditUser, type User } from "@tryghost/admin-x-framework/api/users";

export type Preferences = Record<string, unknown>;

export type UseUserPreferencesResult = UseQueryResult<Preferences> & {
    updatePreferences: (updatedPreferences: Preferences) => Promise<void>;
};

const userPreferencesQueryKeyPrefix = (user: User | undefined) =>
    ["userPreferences", user?.id] as const;

const userPreferencesQueryKey = (user: User | undefined) =>
    [...userPreferencesQueryKeyPrefix(user), user?.accessibility] as const;

export const useUserPreferences = (): UseUserPreferencesResult => {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const { mutateAsync: editUser } = useEditUser();

    // Dependent query - ONE cache entry per user ID
    const result = useQuery({
        queryKey: userPreferencesQueryKey(user),
        queryFn: () => {
            if (!user) {
                throw new Error("User not loaded");
            }
            try {
                const raw = user.accessibility ?? "{}";
                return JSON.parse(raw) as Preferences;
            } catch {
                return {};
            }
        },
        enabled: !!user,
        staleTime: Infinity,
    });

    // Track previous accessibility to avoid infinite invalidation loops
    const prevAccessibilityRef = useRef<string | null | undefined>();

    // Watch for accessibility changes and invalidate
    // This handles external updates from anywhere (other tabs, admin updates, etc.)
    //
    // Note: this uses the query key prefix to invalidate all values for a given
    // `user.id` and ignores the actual value for `accessibility` which ensures
    // we don't have stale values for a given `user`.
    useEffect(() => {
        if (user?.id && prevAccessibilityRef.current !== user?.accessibility) {
            prevAccessibilityRef.current = user.accessibility;
            queryClient.invalidateQueries({
                queryKey: userPreferencesQueryKeyPrefix(user),
            });
        }
    }, [user?.accessibility, user?.id, queryClient]);

    const updatePreferences = useCallback(
        async (updatedPreferences: Preferences) => {
            if (!user) {
                throw new Error("User is not loaded");
            }

            // Read latest preferences from cache to avoid race conditions
            const currentPreferences =
                queryClient.getQueryData<Preferences>(
                    userPreferencesQueryKey(user)
                ) ?? {};

            const newAccessibility = JSON.stringify({
                ...currentPreferences,
                ...updatedPreferences,
            });

            await editUser({
                ...user,
                accessibility: newAccessibility,
            });

            // Note: The useEffect will detect the accessibility change and invalidate
            // the preferences query, which will then refetch with the updated queryFn
        },
        [user, editUser, queryClient]
    );

    return {
        ...result,
        updatePreferences,
    };
};
