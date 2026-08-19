import { useQuery, useMutation, keepPreviousData, type UseQueryResult, type UseMutationResult, type UseQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { useQueryClient } from "@tryghost/admin-x-framework";
import { currentUserQueryKey, useCurrentUser, useFetchCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useEditUser, type User, type UsersResponseType } from "@tryghost/admin-x-framework/api/users";
import { isoDatetimeToDate } from "@/schemas/primitives";
import { deepMerge, type DeepPartial } from "@/utils/deep-merge";

const WhatsNewPreferencesSchema = z.looseObject({
    lastSeenDate: isoDatetimeToDate.optional().catch(undefined),
});

export const DEFAULT_ONBOARDING_PREFERENCES = {
    completedSteps: [] as string[],
    checklistState: "pending" as const,
    startedAt: undefined as Date | undefined,
};

export const OnboardingPreferencesSchema = z.looseObject({
    completedSteps: z.array(z.string()).default(DEFAULT_ONBOARDING_PREFERENCES.completedSteps).catch(DEFAULT_ONBOARDING_PREFERENCES.completedSteps),
    checklistState: z.enum(["pending", "started", "completed", "dismissed"]).default(DEFAULT_ONBOARDING_PREFERENCES.checklistState).catch(DEFAULT_ONBOARDING_PREFERENCES.checklistState),
    startedAt: isoDatetimeToDate.optional().catch(DEFAULT_ONBOARDING_PREFERENCES.startedAt),
});

export const DEFAULT_NAVIGATION_PREFERENCES = {
    expanded: { posts: true, members: true },
    menu: { visible: true },
} as const;

export const NavigationPreferencesSchema = z.looseObject({
    expanded: z.object({
        posts: z.boolean(),
        members: z.boolean().default(true),
    }),
    menu: z.object({
        visible: z.boolean(),
    }),
});

const PreferencesSchema = z.looseObject({
    whatsNew: WhatsNewPreferencesSchema.optional().catch(undefined),
    // Optional (not defaulted) so an absent preference stays absent and isn't
    // eagerly written back on unrelated preference saves. The display fallback to
    // "light" lives at the read site (see useTheme). New users get "system" from
    // the server default; legacy booleans are migrated to strings in the queryFn.
    nightShift: z.enum(["light", "dark", "system"]).optional().catch("light"),
    onboarding: OnboardingPreferencesSchema.default(DEFAULT_ONBOARDING_PREFERENCES).catch(DEFAULT_ONBOARDING_PREFERENCES),
    navigation: NavigationPreferencesSchema.default(DEFAULT_NAVIGATION_PREFERENCES).catch(DEFAULT_NAVIGATION_PREFERENCES),
});

export type Preferences = z.infer<typeof PreferencesSchema>;
export type WhatsNewPreferences = z.infer<typeof WhatsNewPreferencesSchema>;
export type OnboardingPreferences = z.infer<typeof OnboardingPreferencesSchema>;
export type NavigationPreferences = z.infer<typeof NavigationPreferencesSchema>;

const userPreferencesQueryKey = (user: User | undefined) => ["userPreferences", user?.id, user?.accessibility] as const;

// The write below depends on a user read straight from the API, so validate the
// fields it uses before trusting them. A payload that does not parse is handled
// like a read that failed.
const CurrentUserResponseSchema = z.looseObject({
    users: z.array(z.looseObject({
        id: z.string(),
        accessibility: z.string().nullish(),
    })).min(1),
});

/** What a preferences write reads off the user, whoever supplied it. */
type PreferenceUser = z.infer<typeof CurrentUserResponseSchema>["users"][number];

function parsePreferences(user: Pick<PreferenceUser, "accessibility">): Preferences {
    const raw = user.accessibility || "{}";
    const parsedRaw: unknown = JSON.parse(raw);
    const parsed: Record<string, unknown> =
        parsedRaw && typeof parsedRaw === "object" && !Array.isArray(parsedRaw)
            ? parsedRaw as Record<string, unknown>
            : {};

    if (parsed.nightShift === true) {
        parsed.nightShift = "dark";
    } else if (parsed.nightShift === false) {
        parsed.nightShift = "light";
    }

    return PreferencesSchema.parse(parsed);
}

export function useUserPreferences<TData = Preferences>(
    options?: Omit<UseQueryOptions<Preferences, Error, TData>, 'queryKey' | 'queryFn' | 'staleTime' | 'gcTime'>
): UseQueryResult<TData> {
    const { data: user } = useCurrentUser();

    return useQuery<Preferences, Error, TData>({
        ...options,
        queryKey: userPreferencesQueryKey(user),
        queryFn: () => {
            if (!user) {
                throw new Error("User not loaded");
            }

            return parsePreferences(user);
        },
        enabled: !!user,
        placeholderData: keepPreviousData,
        staleTime: Infinity,
        // Query key includes user?.accessibility to automatically react to changes from ANY source
        // (our mutation, other code calling editUser, external updates, etc.). When accessibility
        // changes, the query key changes, making the old cache entry inactive. gcTime: 0 ensures
        // orphaned entries are immediately garbage collected, preventing memory leaks while keeping
        // the current active entry cached indefinitely.
        gcTime: 0,
    });
}

export const useEditUserPreferences = (): UseMutationResult<void, Error, DeepPartial<Preferences>, unknown> => {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const { mutateAsync: editUser } = useEditUser();
    const fetchCurrentUser = useFetchCurrentUser();

    return useMutation({
        // Preference edits write the whole accessibility blob from a merge of
        // the current state; the shared scope serializes concurrent edits so
        // the later one merges on top of the earlier write instead of racing.
        scope: { id: "user-preferences" },
        mutationFn: async (updatedPreferences: DeepPartial<Preferences>) => {
            // Merge over the server's blob, not the cached one. Ember's feature
            // and onboarding services write this same field, as does Admin in
            // another tab, and the cached user is not refetched on mount or on
            // window focus, so a merge over the cache silently reverts whatever
            // those writers stored. Read around the cache: writing the pre-write
            // user into it would flip the UI back until this write lands.
            //
            // A read that fails falls through to the cache, which is what this
            // merged over before. Dropping the user's change is worse than a
            // merge that might be stale, and every caller here floats the
            // promise, so a dropped write is silent.
            const serverUser = await fetchCurrentUser()
                .then(response => CurrentUserResponseSchema.parse(response).users[0])
                .catch(() => undefined);

            // The cache carries the previous write of a serialized mutation;
            // the render closure is the last resort.
            const latestUser: PreferenceUser | undefined = serverUser ?? queryClient.getQueryData<UsersResponseType>(currentUserQueryKey)?.users[0] ?? user;

            if (!latestUser) {
                throw new Error("User is not loaded");
            }

            const newPreferences = deepMerge(parsePreferences(latestUser), updatedPreferences);

            const encodedForStorage = PreferencesSchema.encode(newPreferences);

            // Send the blob alone: a whole-user payload built from a read taken
            // moments ago would revert a name or a role changed in between.
            await editUser({
                id: latestUser.id,
                accessibility: JSON.stringify(encodedForStorage),
            });
        },
    });
};
