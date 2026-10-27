import {
  useQuery,
  useMutation,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { z } from 'zod';
import { useQueryClient } from '@tryghost/admin-x-framework';
import { currentUserQueryKey, useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  useEditUser,
  type User,
  type UsersResponseType,
} from '@tryghost/admin-x-framework/api/users';
import type { RequestOptions } from '@tryghost/admin-x-framework/hooks';
import { isoDatetimeToDate } from '@/schemas/primitives';
import { deepMerge, type DeepPartial } from '@/utils/deep-merge';

const WhatsNewPreferencesSchema = z.looseObject({
  lastSeenDate: isoDatetimeToDate.optional().catch(undefined),
});

export const DEFAULT_ONBOARDING_PREFERENCES = {
  completedSteps: [] as string[],
  checklistState: 'pending' as const,
  startedAt: undefined as Date | undefined,
};

export const OnboardingPreferencesSchema = z.looseObject({
  completedSteps: z
    .array(z.string())
    .default(DEFAULT_ONBOARDING_PREFERENCES.completedSteps)
    .catch(DEFAULT_ONBOARDING_PREFERENCES.completedSteps),
  checklistState: z
    .enum(['pending', 'started', 'completed', 'dismissed'])
    .default(DEFAULT_ONBOARDING_PREFERENCES.checklistState)
    .catch(DEFAULT_ONBOARDING_PREFERENCES.checklistState),
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
    // Whether the admin7Design sidebar is pinned ("full") or tucked into its
    // floating circle ("compact"). Optional (not defaulted), like nightShift:
    // blobs saved without it parse unchanged and aren't rewritten.
    // useSidebarMode falls back to "full".
    mode: z.enum(['full', 'compact']).optional().catch(undefined),
  }),
  // Installation ids of the apps this user pinned to, or unpinned from, the
  // sidebar. Apps in neither are pinned while there's room (see
  // resolvePinnedApps). Optional, like menu.mode.
  apps: z
    .object({
      pinned: z.array(z.string()).catch([]),
      unpinned: z.array(z.string()).catch([]),
    })
    .optional()
    .catch(undefined),
});

export const EDITOR_BODY_FONTS = ['serif', 'sans', 'mono'] as const;

export const EditorPreferencesSchema = z.looseObject({
  // Optional, like nightShift: the editor falls back to "serif" where it reads it.
  bodyFont: z.enum(EDITOR_BODY_FONTS).optional().catch(undefined),
});

const PreferencesSchema = z.looseObject({
  whatsNew: WhatsNewPreferencesSchema.optional().catch(undefined),
  // Optional (not defaulted) so an absent preference stays absent and isn't
  // eagerly written back on unrelated preference saves. The display fallback to
  // "light" lives at the read site (see useTheme). New users get "system" from
  // the server default; legacy booleans are migrated to strings in the queryFn.
  nightShift: z.enum(['light', 'dark', 'system']).optional().catch('light'),
  onboarding: OnboardingPreferencesSchema.default(DEFAULT_ONBOARDING_PREFERENCES).catch(
    DEFAULT_ONBOARDING_PREFERENCES,
  ),
  navigation: NavigationPreferencesSchema.default(DEFAULT_NAVIGATION_PREFERENCES).catch(
    DEFAULT_NAVIGATION_PREFERENCES,
  ),
  editor: EditorPreferencesSchema.optional().catch(undefined),
});

export type Preferences = z.infer<typeof PreferencesSchema>;
export type WhatsNewPreferences = z.infer<typeof WhatsNewPreferencesSchema>;
export type OnboardingPreferences = z.infer<typeof OnboardingPreferencesSchema>;
export type NavigationPreferences = z.infer<typeof NavigationPreferencesSchema>;
export type EditorPreferences = z.infer<typeof EditorPreferencesSchema>;

/** The transport options a screen that handles an expired session itself passes on. */
type PreferencesRequestOptions = Pick<RequestOptions, 'sessionExpiryRedirect'>;

const userPreferencesQueryKey = (user: User | undefined) =>
  ['userPreferences', user?.id, user?.accessibility] as const;

function parsePreferences(user: User): Preferences {
  const raw = user.accessibility || '{}';
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(raw);
  } catch {
    parsedRaw = {};
  }
  const parsed: Record<string, unknown> =
    parsedRaw && typeof parsedRaw === 'object' && !Array.isArray(parsedRaw)
      ? (parsedRaw as Record<string, unknown>)
      : {};

  if (parsed.nightShift === true) {
    parsed.nightShift = 'dark';
  } else if (parsed.nightShift === false) {
    parsed.nightShift = 'light';
  }

  return PreferencesSchema.parse(parsed);
}

export function useUserPreferences<TData = Preferences>({
  requestOptions,
  ...options
}: Omit<
  UseQueryOptions<Preferences, Error, TData>,
  'queryKey' | 'queryFn' | 'staleTime' | 'gcTime'
> & { requestOptions?: PreferencesRequestOptions } = {}): UseQueryResult<TData> {
  const { data: user } = useCurrentUser({ requestOptions });

  return useQuery<Preferences, Error, TData>({
    ...options,
    queryKey: userPreferencesQueryKey(user),
    queryFn: () => {
      if (!user) {
        throw new Error('User not loaded');
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

/**
 * The preferences to change, or a function that works them out from the
 * preferences as they are when the edit runs, after any edits queued ahead of it.
 */
export type PreferencesUpdate =
  | DeepPartial<Preferences>
  | ((current: Preferences) => DeepPartial<Preferences>);

export const useEditUserPreferences = ({
  requestOptions,
}: { requestOptions?: PreferencesRequestOptions } = {}): UseMutationResult<
  void,
  Error,
  PreferencesUpdate,
  unknown
> => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser({ requestOptions });
  const { mutateAsync: editUser } = useEditUser();

  return useMutation({
    // Preference edits write the whole accessibility blob from a merge of
    // the current state; the shared scope serializes concurrent edits so
    // the later one merges on top of the earlier write instead of racing.
    scope: { id: 'user-preferences' },
    mutationFn: async (update: PreferencesUpdate) => {
      // Read the user at run time (not from the render closure): a
      // serialized mutation must merge on top of the previous write.
      const latestUser =
        queryClient.getQueryData<UsersResponseType>(currentUserQueryKey)?.users[0] ?? user;

      if (!latestUser) {
        throw new Error('User is not loaded');
      }

      const current = parsePreferences(latestUser);
      const newPreferences = deepMerge(
        current,
        typeof update === 'function' ? update(current) : update,
      );

      const encodedForStorage = PreferencesSchema.encode(newPreferences);

      await editUser({
        ...latestUser,
        accessibility: JSON.stringify(encodedForStorage),
        ...requestOptions,
      });
    },
  });
};
