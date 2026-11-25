import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { getNewsletterRecipientFilter } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { publishNewsletterSelect } from '@tryghost/test-data/selectors/editor';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { PAID_TIERS_SEARCH_PARAMS } from '@/editor/browse-params';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useEditorSettings } from '@/editor/use-editor-settings';
import { useLabelValueSource } from '@/shared/filter-sources';
import { useEffect, useId, useMemo } from 'react';
import { z } from 'zod';
import { parseRecipientTiers } from './email-recipients-boundary';
import { RecipientSelect, type SegmentOption } from './recipient-select';
import type { NewsletterInput, PublishOptionsState } from '@/editor/publish/publish-options';

export interface EmailRecipientsOptionsProps {
  state: PublishOptionsState;
  onSetNewsletter: (newsletter: NewsletterInput | null) => void;
  onSetRecipientFilter: (filter: string | null) => void;
}

const stripeBoundarySchema = z.object({
  settingsData: z.looseObject({
    settings: z.array(z.looseObject({ key: z.string(), value: z.unknown() })),
  }),
  configData: z.looseObject({ config: z.looseObject({ stripeDirect: z.boolean() }) }),
});

const LABEL_QUERY_OPTIONS = {
  defaultErrorHandler: false,
  requestOptions: EDITOR_REQUEST_OPTIONS,
} as const;

export function EmailRecipientsOptions({
  state,
  onSetNewsletter,
  onSetRecipientFilter,
}: EmailRecipientsOptionsProps) {
  const newsletterId = useId();
  const { data: settingsData } = useEditorSettings();
  const { data: configData } = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const tiersQuery = useBrowseTiers({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: PAID_TIERS_SEARCH_PARAMS,
  });
  const {
    data: tiersData,
    fetchNextPage: fetchNextTierPage,
    hasNextPage: hasNextTierPage,
    isError: tiersError,
    isFetchingNextPage: isFetchingNextTierPage,
  } = tiersQuery;
  // Core caps `limit=all` at one page, so there may be a next page. Tiers are
  // few, so read them all before offering any.
  useEffect(() => {
    if (hasNextTierPage && !isFetchingNextTierPage && !tiersError) {
      void fetchNextTierPage();
    }
  }, [fetchNextTierPage, hasNextTierPage, isFetchingNextTierPage, tiersError]);

  const tiersSettled =
    !tiersQuery.isLoading && !isFetchingNextTierPage && (!hasNextTierPage || tiersError);

  // Labels can number in the thousands, so they aren't walked. The source
  // serves a page and searches the server for the rest.
  const labelSource = useLabelValueSource({ queryOptions: LABEL_QUERY_OPTIONS });

  const stripeBoundary = stripeBoundarySchema.safeParse({ settingsData, configData });
  const paidAvailable = stripeBoundary.success
    ? (() => {
        const { settings, config } = {
          settings: stripeBoundary.data.settingsData.settings,
          config: stripeBoundary.data.configData.config,
        };
        const hasSetting = (key: string) =>
          settings.some((setting) => setting.key === key && Boolean(setting.value));
        const hasDirectKeys =
          hasSetting('stripe_secret_key') && hasSetting('stripe_publishable_key');
        const hasConnectKeys =
          hasSetting('stripe_connect_secret_key') && hasSetting('stripe_connect_publishable_key');

        return config.stripeDirect ? hasDirectKeys : hasConnectKeys || hasDirectKeys;
      })()
    : false;

  const tierOptions = useMemo<SegmentOption[]>(() => {
    if (!tiersSettled) {
      return [];
    }

    const tiers = parseRecipientTiers(tiersError ? undefined : tiersData);
    if (tiers.length <= 1) {
      return [];
    }

    return [...tiers]
      .sort((a, b) => Number(b.active) - Number(a.active))
      .map((tier) => ({
        segment: `tier:${tier.slug}`,
        aliases: [`tier_id:${tier.id}`],
        name: tier.name,
        group: tier.active ? 'Active tiers' : 'Archived tiers',
      }));
  }, [tiersData, tiersError, tiersSettled]);

  const newsletterRecipientFilter = state.newsletter
    ? getNewsletterRecipientFilter({
        slug: state.newsletter.slug,
        visibility: state.newsletter.visibility,
      })
    : null;

  return (
    <Stack gap="lg">
      <RecipientSelect
        filter={state.recipientFilter}
        labelSource={labelSource}
        newsletterRecipientFilter={newsletterRecipientFilter}
        paidAvailable={paidAvailable}
        tierOptions={tierOptions}
        tiersLoading={!tiersSettled}
        onChange={onSetRecipientFilter}
      />

      {state.newsletters.length > 1 ? (
        <Stack gap="sm">
          <Label htmlFor={newsletterId}>Newsletter</Label>
          <Select
            value={state.newsletter?.slug ?? ''}
            onValueChange={(slug) =>
              onSetNewsletter(state.newsletters.find((option) => option.slug === slug) ?? null)
            }
          >
            <SelectTrigger data-testid={publishNewsletterSelect} id={newsletterId}>
              {/* Radix would copy the whole option, count included, into the trigger. */}
              <SelectValue placeholder="Select a newsletter">
                {state.newsletter ? (state.newsletter.name ?? state.newsletter.slug) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {state.newsletters.map((newsletter) => (
                <SelectItem key={newsletter.slug} value={newsletter.slug}>
                  {newsletter.name ?? newsletter.slug}
                  {newsletter.activeMembers === undefined ? null : (
                    <>
                      {' '}
                      <Text as="span" leading="none" size="sm" tone="secondary">
                        ({formatNumber(newsletter.activeMembers)})
                      </Text>
                    </>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      ) : null}
    </Stack>
  );
}
