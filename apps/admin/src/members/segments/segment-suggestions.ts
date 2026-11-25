import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import {
  checkStripeEnabled,
  getSettingValue,
  useBrowseSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { useMemo } from 'react';
import { useMemberViews } from '@/members/hooks/use-member-views';

/**
 * A segment offered as a place to start: picking it fills in the builder's filters, and its
 * name if none is typed yet. Nothing is saved until the publisher saves it, and its filters can
 * be changed first.
 */
export interface SegmentSuggestion {
  /** What it is called, as a chip and as the name it fills in. */
  name: string;
  /** Its filter, in the form the members filter bar writes, so it opens unchanged. */
  filter: string;
}

const NEW_MEMBERS: SegmentSuggestion = {
  name: 'New in the last 30 days',
  filter: 'created_at:>=now-30d',
};
const ACTIVE_MEMBERS: SegmentSuggestion = {
  name: 'Active in the last 30 days',
  filter: 'last_seen_at:>=now-30d',
};
const ENGAGED_FREE_MEMBERS: SegmentSuggestion = {
  name: 'Engaged free members',
  filter: 'email_open_rate:>49+status:free',
};
const DISENGAGED_PAID_MEMBERS: SegmentSuggestion = {
  name: 'Disengaged paid members',
  filter: 'email_open_rate:<20+status:paid',
};
const ANNUAL_SUBSCRIBERS: SegmentSuggestion = {
  name: 'Annual subscribers',
  filter: 'status:paid+subscriptions.plan_interval:year',
};

/**
 * POC (poc/segments-ui): the segments Admin offers to start from by default, for any place that
 * shows the builder. Only those this site can use: open rates need email open tracking on, and
 * paid members need Stripe connected. Five at most, each one that a single click on a filter
 * wouldn't give. None that points at what is particular to a site, such as its tiers.
 *
 * A place can pass its own instead, or add to these. Whatever it passes, the builder leaves out
 * any the site already has as a segment.
 */
export function useSegmentSuggestions(): SegmentSuggestion[] {
  const { data: settingsData } = useBrowseSettings({});
  const { data: configData } = useBrowseConfig();

  return useMemo(() => {
    const settings = settingsData?.settings ?? [];
    const tracksOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const hasPaidMembers = Boolean(configData) && checkStripeEnabled(settings, configData!.config);

    return [
      NEW_MEMBERS,
      ACTIVE_MEMBERS,
      ...(tracksOpens ? [ENGAGED_FREE_MEMBERS] : []),
      ...(tracksOpens && hasPaidMembers ? [DISENGAGED_PAID_MEMBERS] : []),
      ...(hasPaidMembers ? [ANNUAL_SUBSCRIBERS] : []),
    ];
  }, [settingsData, configData]);
}

/** A name as the server compares names: case and surrounding whitespace aside. */
const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * The suggestions worth offering: none the site already has, whoever passed them. Not one whose
 * filter a segment has, which would be a copy, nor one whose name a segment has, which it
 * couldn't be saved under. POC: filters are compared as text, which holds for filters written
 * the way Admin writes them.
 */
export function useNewSuggestions(suggestions: SegmentSuggestion[]) {
  const segments = useMemberViews();
  return useMemo(() => {
    const filters = new Set(segments.map((segment) => segment.filter));
    const names = new Set(segments.map((segment) => normalizeName(segment.name)));
    return suggestions.filter(
      (suggestion) => !filters.has(suggestion.filter) && !names.has(normalizeName(suggestion.name)),
    );
  }, [segments, suggestions]);
}
