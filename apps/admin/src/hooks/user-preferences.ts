import { useQuery, useMutation, type UseQueryResult, type UseMutationResult, type UseQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { useQueryClient } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useEditUser, type User } from "@tryghost/admin-x-framework/api/users";
import { isoDatetimeToDate } from "@/schemas/primitives";
import { deepMerge, type DeepPartial } from "@/utils/deep-merge";

const WhatsNewPreferencesSchema = z.looseObject({
    lastSeenDate: isoDatetimeToDate.optional().catch(undefined),
});

export const DEFAULT_NAVIGATION_PREFERENCES = {
    expanded: { posts: true },
    menu: { visible: true },
} as const;

export const NavigationPreferencesSchema = z.looseObject({
    expanded: z.object({
        posts: z.boolean(),
    }),
    menu: z.object({
        visible: z.boolean(),
    }),
});

const PreferencesSchema = z.looseObject({
    whatsNew: WhatsNewPreferencesSchema.optional().catch(undefined),
    nightShift: z.boolean().optional(),
    navigation: NavigationPreferencesSchema.default(DEFAULT_NAVIGATION_PREFERENCES).catch(DEFAULT_NAVIGATION_PREFERENCES),
});

export type Preferences = z.infer<typeof PreferencesSchema>;
export type WhatsNewPreferences = z.infer<typeof WhatsNewPreferencesSchema>;
export type NavigationPreferences = z.infer<typeof NavigationPreferencesSchema>;

const userPreferencesQueryKey = (user: User | undefined) => ["userPreferences", user?.id, user?.accessibility] as const;

export function useUserPreferences<TData = Preferences>(
    options?: Omit<UseQueryOptions<Preferences, Error, TData>, 'queryKey' | 'queryFn' | 'staleTime' | 'cacheTime'>
): UseQueryResult<TData> {
    const { data: user } = useCurrentUser();

    return useQuery<Preferences, Error, TData>({
        ...options,
        queryKey: userPreferencesQueryKey(user),
        queryFn: () => {
            if (!user) {
                throw new Error("User not loaded");
            }

            const raw = user.accessibility || "{}";
            const parsed = JSON.parse(raw) as unknown;

            return PreferencesSchema.parse(parsed);
        },
        enabled: !!user,
        staleTime: Infinity,
        // Query key includes user?.accessibility to automatically react to changes from ANY source
        // (our mutation, other code calling editUser, external updates, etc.). When accessibility
        // changes, the query key changes, making the old cache entry inactive. cacheTime: 0 ensures
        // orphaned entries are immediately garbage collected, preventing memory leaks while keeping
        // the current active entry cached indefinitely.
        cacheTime: 0,
    });
}

export const useEditUserPreferences = (): UseMutationResult<void, Error, DeepPartial<Preferences>, unknown> => {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const { mutateAsync: editUser } = useEditUser();

    return useMutation({
        mutationFn: async (updatedPreferences: DeepPartial<Preferences>) => {
            if (!user) {
                throw new Error("User is not loaded");
            }

            const currentPreferences = queryClient.getQueryData<Preferences>(userPreferencesQueryKey(user)) ?? PreferencesSchema.parse({});

            // TODO: use zod to validate?
            const newPreferences = deepMerge(currentPreferences, updatedPreferences);

            const encodedForStorage = PreferencesSchema.encode(newPreferences);

            await editUser({
                ...user,
                accessibility: JSON.stringify(encodedForStorage),
            });
        },
    });
};
