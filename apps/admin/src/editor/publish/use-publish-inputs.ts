import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { PublishSiteInput, PublishUserInput } from './publish-options';

const settingValueSchema = z.union([z.string(), z.boolean(), z.number(), z.null()]);
const settingSchema = z.looseObject({ key: z.string(), value: settingValueSchema });
const defaultRecipientsSchema = z.enum(['disabled', 'visibility', 'filter']);
const newsletterSchema = z
  .looseObject({
    slug: z.string(),
    name: z.string(),
    status: z.string(),
    visibility: z.string(),
    sort_order: z.number().optional(),
  })
  // The API's serialized field is intentionally snake_case at this boundary.
  .transform(({ sort_order: sortOrder, ...newsletter }) => ({ ...newsletter, sortOrder }));

const publishInputsBoundarySchema = z.object({
  settingsData: z.looseObject({ settings: z.array(settingSchema) }),
  configData: z.looseObject({
    config: z.looseObject({ mailgunIsConfigured: z.boolean().optional() }),
  }),
  newslettersData: z.looseObject({ newsletters: z.array(newsletterSchema) }),
  currentUser: z.looseObject({
    roles: z.array(z.looseObject({ name: z.string() })),
  }),
  memberCount: z.number().int().nonnegative().nullable(),
});

const DEFAULT_SITE: PublishSiteInput = {
  membersEnabled: true,
  mailgunConfigured: false,
  editorDefaultEmailRecipients: 'visibility',
  editorDefaultEmailRecipientsFilter: null,
  memberCount: null,
  newsletters: [],
};
const DEFAULT_USER: PublishUserInput = { isAdmin: false, isAuthorOrContributor: false };

function stringSetting(settings: z.infer<typeof settingSchema>[], key: string): string | null {
  const value = settings.find((setting) => setting.key === key)?.value;
  return typeof value === 'string' ? value : null;
}

export interface AssembledPublishInputs {
  site: PublishSiteInput;
  user: PublishUserInput;
  timezone: string;
  isValid: boolean;
}

/** Validates API-backed values before projecting the small publish-machine input. */
export function assemblePublishInputs(boundaryData: {
  settingsData: unknown;
  configData: unknown;
  newslettersData: unknown;
  currentUser: unknown;
  memberCount: unknown;
}): AssembledPublishInputs {
  const parsed = publishInputsBoundarySchema.safeParse(boundaryData);

  if (!parsed.success) {
    return { site: DEFAULT_SITE, user: DEFAULT_USER, timezone: 'Etc/UTC', isValid: false };
  }

  const { settingsData, configData, newslettersData, currentUser, memberCount } = parsed.data;
  const settings = settingsData.settings;
  const defaultRecipientsValue = settings.find(
    (setting) => setting.key === 'editor_default_email_recipients',
  )?.value;
  const defaultRecipients =
    defaultRecipientsValue === null || defaultRecipientsValue === undefined
      ? defaultRecipientsSchema.safeParse('visibility')
      : defaultRecipientsSchema.safeParse(defaultRecipientsValue);

  if (!defaultRecipients.success) {
    return { site: DEFAULT_SITE, user: DEFAULT_USER, timezone: 'Etc/UTC', isValid: false };
  }
  const roles = new Set(currentUser.roles.map((role) => role.name));

  // Both sources count: self-hosters configure Mailgun in settings, hosts inject it via config.
  const configuredInSettings = Boolean(
    stringSetting(settings, 'mailgun_api_key') &&
    stringSetting(settings, 'mailgun_domain') &&
    stringSetting(settings, 'mailgun_base_url'),
  );

  return {
    site: {
      membersEnabled: stringSetting(settings, 'members_signup_access') !== 'none',
      mailgunConfigured: configuredInSettings || configData.config.mailgunIsConfigured === true,
      editorDefaultEmailRecipients: defaultRecipients.data,
      editorDefaultEmailRecipientsFilter: stringSetting(
        settings,
        'editor_default_email_recipients_filter',
      ),
      memberCount,
      newsletters: newslettersData.newsletters,
    },
    user: {
      isAdmin: roles.has('Owner') || roles.has('Administrator'),
      isAuthorOrContributor: roles.has('Author') || roles.has('Contributor'),
    },
    timezone: stringSetting(settings, 'timezone') ?? 'Etc/UTC',
    isValid: true,
  };
}

export interface PublishInputs {
  site: PublishSiteInput;
  user: PublishUserInput;
  timezone: string;
  /** False until every input has loaded; the machine reads its inputs once. */
  isReady: boolean;
  /** A query or validation failure that the caller can render in place. */
  error: Error | null;
  /** Retries each API input owned by this adapter. */
  retry: () => void;
}

function publishInputError(error: unknown): Error | null {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error : new Error('The publish settings could not be loaded.');
}

/**
 * Assembles the publish machine's site and user inputs from the API. The
 * machine reads them once at creation, so a caller must not build it until
 * `isReady`.
 */
export function usePublishInputs(): PublishInputs {
  const settingsQuery = useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const configQuery = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const newslettersQuery = useBrowseNewsletters({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: { limit: 'all' },
  });
  const {
    fetchNextPage: fetchNextNewsletterPage,
    hasNextPage: hasNextNewsletterPage,
    isError: newslettersError,
    isFetchingNextPage: isFetchingNextNewsletterPage,
  } = newslettersQuery;

  // Core caps `limit=all`, so the response can still contain a next page.
  // The publish machine must see every newsletter before it chooses a default.
  useEffect(() => {
    if (hasNextNewsletterPage && !isFetchingNextNewsletterPage && !newslettersError) {
      void fetchNextNewsletterPage();
    }
  }, [
    fetchNextNewsletterPage,
    hasNextNewsletterPage,
    isFetchingNextNewsletterPage,
    newslettersError,
  ]);
  const currentUserQuery = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  // Site-wide total, the way Ember's publish options read it.
  const {
    count: memberCount,
    isLoading: memberCountLoading,
    isFetching: memberCountFetching,
    error: memberCountError,
    refetch: refetchMemberCount,
  } = useMembersCount('', { requestOptions: EDITOR_REQUEST_OPTIONS });
  const settingsData = settingsQuery.data;
  const configData = configQuery.data;
  const newslettersData = newslettersQuery.data;
  const currentUser = currentUserQuery.data;

  const assembled = useMemo(
    () =>
      assemblePublishInputs({
        settingsData,
        configData,
        newslettersData,
        currentUser,
        memberCount,
      }),
    [settingsData, configData, newslettersData, currentUser, memberCount],
  );
  const isLoading =
    settingsQuery.isLoading ||
    settingsQuery.isFetching ||
    configQuery.isLoading ||
    configQuery.isFetching ||
    newslettersQuery.isLoading ||
    newslettersQuery.isFetching ||
    newslettersQuery.hasNextPage ||
    newslettersQuery.isFetchingNextPage ||
    currentUserQuery.isLoading ||
    currentUserQuery.isFetching ||
    memberCountLoading ||
    memberCountFetching;
  const error = useMemo(() => {
    const queryError =
      settingsQuery.error ??
      configQuery.error ??
      newslettersQuery.error ??
      currentUserQuery.error ??
      memberCountError;

    if (queryError) {
      return publishInputError(queryError);
    }

    if (!isLoading && !assembled.isValid) {
      return new Error('The publish settings response was invalid.');
    }

    return null;
  }, [
    assembled.isValid,
    configQuery.error,
    currentUserQuery.error,
    isLoading,
    memberCountError,
    newslettersQuery.error,
    settingsQuery.error,
  ]);
  const retry = useCallback(() => {
    void Promise.all([
      settingsQuery.refetch(),
      configQuery.refetch(),
      newslettersQuery.refetch(),
      currentUserQuery.refetch(),
      refetchMemberCount(),
    ]);
  }, [configQuery, currentUserQuery, newslettersQuery, refetchMemberCount, settingsQuery]);

  return {
    site: assembled.site,
    user: assembled.user,
    timezone: assembled.timezone,
    isReady: assembled.isValid && !isLoading && !error,
    error,
    retry,
  };
}
