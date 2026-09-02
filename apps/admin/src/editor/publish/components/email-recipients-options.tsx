import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { checkStripeEnabled, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getNewsletterRecipientFilter } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { publishNewsletterSelect } from '@tryghost/test-data/selectors/editor';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseLabelsInfinite } from '@tryghost/admin-x-framework/api/labels';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { useMemo } from 'react';
import { RecipientSelect, type SegmentOption } from './recipient-select';
import type { NewsletterInput, PublishOptionsState } from '@/editor/publish/publish-options';

export interface EmailRecipientsOptionsProps {
  state: PublishOptionsState;
  onSetNewsletter: (newsletter: NewsletterInput | null) => void;
  onSetRecipientFilter: (filter: string | null) => void;
}

export function EmailRecipientsOptions({
  state,
  onSetNewsletter,
  onSetRecipientFilter,
}: EmailRecipientsOptionsProps) {
  const { data: settingsData } = useBrowseSettings();
  const { data: configData } = useBrowseConfig();
  const { data: tiersData } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
  });
  const { data: labelsData } = useBrowseLabelsInfinite();

  const paidAvailable = Boolean(
    settingsData?.settings &&
    configData?.config &&
    checkStripeEnabled(settingsData.settings, configData.config),
  );

  const segmentOptions = useMemo<SegmentOption[]>(() => {
    const tiers = tiersData?.tiers ?? [];
    // A single paid tier adds nothing to a paid/free split, so Ember hides it.
    const tierOptions =
      tiers.length > 1
        ? [...tiers]
            .sort((a, b) => Number(b.active) - Number(a.active))
            .map((tier) => ({ segment: `tier:${tier.slug}`, name: tier.name }))
        : [];

    return [
      ...tierOptions,
      ...(labelsData?.labels ?? []).map((label) => ({
        segment: `label:${label.slug}`,
        name: label.name,
      })),
    ];
  }, [labelsData, tiersData]);

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
        newsletterRecipientFilter={newsletterRecipientFilter}
        paidAvailable={paidAvailable}
        segmentOptions={segmentOptions}
        onChange={onSetRecipientFilter}
      />

      {state.newsletters.length > 1 ? (
        <Stack gap="sm">
          <Label htmlFor="publish-newsletter">Newsletter</Label>
          <Select
            value={state.newsletter?.slug ?? ''}
            onValueChange={(slug) =>
              onSetNewsletter(state.newsletters.find((option) => option.slug === slug) ?? null)
            }
          >
            <SelectTrigger data-testid={publishNewsletterSelect} id="publish-newsletter">
              <SelectValue placeholder="Select a newsletter" />
            </SelectTrigger>
            <SelectContent>
              {state.newsletters.map((newsletter) => (
                <SelectItem key={newsletter.slug} value={newsletter.slug}>
                  {newsletter.name ?? newsletter.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      ) : null}
    </Stack>
  );
}
