import { useMemo } from 'react';
import { z } from 'zod';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useForceUpgrade } from '@/billing/api';
import { SETTINGS_SEARCH_HEADING } from '@/settings/search-source';
import { CONTENT_HEADINGS } from './content-sources';
import type { NavigateItem, SearchSource } from './search-source';

const BILLING_ROUTE_ROOT = '/pro';

const BUILT_IN_HEADINGS = [...CONTENT_HEADINGS, SETTINGS_SEARCH_HEADING];

function parseEach<T>(schema: z.ZodType<T>, items: unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Host config defines the billing group: `{groupName, items: [{id, title, path, keywords}]}`. */
const billingSearchConfigSchema = z.object({
  // a built-in heading would put two groups under one heading
  groupName: z
    .string()
    .trim()
    .min(1)
    .refine((name) => !BUILT_IN_HEADINGS.includes(name)),
  items: z.array(z.unknown()),
});

const billingSearchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // a billing app route: no query, fragment, whitespace, or trailing slash
  path: z
    .string()
    .regex(/^\/[^?#\s]*$/)
    .refine((path) => path === '/' || !path.endsWith('/')),
  keywords: z.string().catch(''),
});

export function billingSearchSource(searchConfig: unknown, isLoading = false): SearchSource {
  const config = billingSearchConfigSchema.safeParse(searchConfig);
  const items = config.success
    ? parseEach(billingSearchItemSchema, config.data.items).map(
        ({ path, ...item }): NavigateItem => ({
          ...item,
          kind: 'navigate',
          to: path === '/' ? BILLING_ROUTE_ROOT : `${BILLING_ROUTE_ROOT}${path}`,
        }),
      )
    : [];

  return { id: 'billing', heading: config.data?.groupName ?? '', items, isLoading };
}

/** The billing app route a path shows, or undefined outside the billing app. */
export function getBillingSubRoute(path: string): string | undefined {
  if (path === BILLING_ROUTE_ROOT) {
    return '/';
  }

  return path.startsWith(`${BILLING_ROUTE_ROOT}/`)
    ? path.slice(BILLING_ROUTE_ROOT.length)
    : undefined;
}

/** Billing pages from host config, for the owner, or for any staff while the site must upgrade. */
export function useBillingSearchSource(): SearchSource {
  const { data: config, isLoading: isConfigLoading } = useBrowseConfig();
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const forceUpgrade = useForceUpgrade();

  const hostSettings = config?.config.hostSettings;
  const canAccessBilling =
    Boolean(forceUpgrade) ||
    (Boolean(hostSettings?.billing?.enabled) && Boolean(currentUser && isOwnerUser(currentUser)));
  const searchConfig = canAccessBilling ? hostSettings?.billing?.search : undefined;
  const isLoading = isConfigLoading || isUserLoading;

  return useMemo(() => billingSearchSource(searchConfig, isLoading), [searchConfig, isLoading]);
}
