import {
  FREE_SEGMENT,
  PAID_SEGMENT,
  buildRecipientFilter,
  parseRecipientFilter,
} from '@tryghost/admin-x-framework/utils/recipient-filter';
import { Checkbox, Label } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useId, useState } from 'react';
import { LabelPicker } from '@/members/api';
import type { HybridValueSource } from '@/shared/filter-sources';
import type { ComboboxOptionSource } from '@tryghost/shade/components';
import {
  publishRecipientFree,
  publishRecipientPaid,
  publishRecipientSegments,
  publishRecipientSpecific,
} from '@tryghost/test-data/selectors/editor';

const LABEL_SEGMENT_PREFIX = 'label:';
const LABELS_GROUP = 'Labels';

export interface SegmentOption {
  /** The NQL segment, e.g. `tier:gold` or `label:vip`. */
  segment: string;
  /** Other spellings of the same audience, shown and toggled as this option. */
  aliases?: string[];
  name: string;
  group: string;
}

export interface RecipientSelectProps {
  filter: string | null;
  /** The newsletter's own audience filter, used to scope the free/paid counts. */
  newsletterRecipientFilter: string | null;
  paidAvailable: boolean;
  /** The paid tiers offered as segments, already grouped as active or archived. */
  tierOptions: SegmentOption[];
  /**
   * The site's labels. The source decides how they load: a site with up to a
   * page of labels has them all at once, a larger site searches the server as
   * the user types and pages as they scroll, so the picker never waits for
   * every label before it can be used.
   */
  labelSource: HybridValueSource<string>;
  onChange: (filter: string | null) => void;
}

function SegmentCount({ filter }: { filter: string | null }) {
  const { count } = useMembersCount(filter, { requestOptions: EDITOR_REQUEST_OPTIONS });

  if (count === null) {
    return null;
  }

  return (
    <Text as="span" leading="none" size="sm" tone="secondary">
      ({formatNumber(count)})
    </Text>
  );
}

function labelSlug(segment: string): string | null {
  return segment.startsWith(LABEL_SEGMENT_PREFIX)
    ? segment.slice(LABEL_SEGMENT_PREFIX.length)
    : null;
}

/**
 * Ported from `gh-members-recipient-select`: free/paid checkboxes plus an
 * optional "Specific people" segment selection, all expressed as one NQL
 * recipient filter.
 */
export function RecipientSelect({
  filter,
  newsletterRecipientFilter,
  paidAvailable,
  tierOptions,
  labelSource,
  onChange,
}: RecipientSelectProps) {
  const id = useId();
  const parsed = parseRecipientFilter(filter);
  const canonicalSegment = (segment: string) =>
    tierOptions.find((option) => option.aliases?.includes(segment))?.segment ?? segment;
  const segments = {
    ...parsed,
    specific: [...new Set(parsed.specific.map(canonicalSegment))],
  };
  // Remembers a selection across an off/on toggle, and keeps the picker open
  // when "Specific people" is checked with nothing selected yet.
  const [forceSpecific, setForceSpecific] = useState(false);
  const [previousSpecific, setPreviousSpecific] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');

  // The selected labels ride along so the source resolves their names, whether
  // or not the current page or search happens to include them.
  const selectedLabelSlugs = segments.specific.flatMap((segment) => {
    const slug = labelSlug(segment);
    return slug === null ? [] : [slug];
  });
  const labelState = labelSource.useOptions({ query: search, selectedValues: selectedLabelSlugs });
  // One label is enough to offer the segment picker: the first page says how
  // many there are without anyone waiting for the rest.
  const hasLabels = (labelSource.probe.total ?? 0) > 0;
  const hasSpecificOptions = tierOptions.length > 0 || hasLabels;

  const specificChecked = forceSpecific || segments.specific.length > 0;

  const update = (base: string[], specific: string[]) => {
    onChange(buildRecipientFilter({ base, specific }, { paidAvailable }));
  };

  const toggleBase = (segment: string) => {
    const base = segments.base.includes(segment)
      ? segments.base.filter((item) => item !== segment)
      : [...segments.base, segment];

    update(base, segments.specific);
  };

  const toggleSpecific = () => {
    if (forceSpecific && segments.specific.length === 0) {
      setForceSpecific(false);
      return;
    }

    setForceSpecific(false);

    if (specificChecked) {
      setPreviousSpecific(segments.specific);
      update(segments.base, []);
      return;
    }

    if (previousSpecific) {
      update(segments.base, previousSpecific);
      return;
    }

    setForceSpecific(true);
  };

  const toggleSegment = (segment: string) => {
    const specific = segments.specific.includes(segment)
      ? segments.specific.filter((item) => item !== segment)
      : [...segments.specific, segment];

    if (specific.length === 0) {
      setPreviousSpecific(null);
      setForceSpecific(true);
    }

    update(segments.base, specific);
  };

  const scopedFilter = (segment: string) =>
    newsletterRecipientFilter ? `${newsletterRecipientFilter}+${segment}` : segment;

  const tierLabels = tierOptions.map((option) => ({
    id: option.segment,
    slug: option.segment,
    name: option.name,
    group: option.group,
  }));
  const labelLabels = labelState.options.map((option) => ({
    id: `${LABEL_SEGMENT_PREFIX}${option.value}`,
    slug: `${LABEL_SEGMENT_PREFIX}${option.value}`,
    name: option.label,
    group: LABELS_GROUP,
  }));
  // The labels arrive from the source already matching the search; the tiers
  // are few and already here, so they are narrowed to it in place.
  const normalizedSearch = search.trim().toLowerCase();
  const pickerLabels = [
    ...tierLabels.filter((label) => label.name.toLowerCase().includes(normalizedSearch)),
    ...labelLabels,
  ];
  // Named from everything known, not only what the search left, so a selected
  // segment keeps its pill while the writer types. A label the site no longer
  // has is shown as its slug.
  const resolvedSelectedLabels = segments.specific.map(
    (segment) =>
      [...tierLabels, ...labelLabels].find((label) => label.slug === segment) ?? {
        id: segment,
        slug: segment,
        name: labelSlug(segment) ?? segment,
      },
  );
  const optionSource: ComboboxOptionSource<string> = {
    ...labelState,
    options: pickerLabels.map((label) => ({ value: label.slug, label: label.name })),
    shouldClientFilter: false,
    onSearchChange: setSearch,
  };

  return (
    <Stack gap="md">
      <Stack gap="sm">
        <Inline gap="sm">
          <Checkbox
            checked={segments.free}
            data-testid={publishRecipientFree}
            id={`${id}-free`}
            onCheckedChange={() => toggleBase(FREE_SEGMENT)}
          />
          <Label htmlFor={`${id}-free`}>
            Free <SegmentCount filter={scopedFilter(FREE_SEGMENT)} />
          </Label>
        </Inline>

        {paidAvailable ? (
          <Inline gap="sm">
            <Checkbox
              checked={segments.paid}
              data-testid={publishRecipientPaid}
              id={`${id}-paid`}
              onCheckedChange={() => toggleBase(PAID_SEGMENT)}
            />
            <Label htmlFor={`${id}-paid`}>
              Paid <SegmentCount filter={scopedFilter(PAID_SEGMENT)} />
            </Label>
          </Inline>
        ) : null}

        {hasSpecificOptions ? (
          <Inline gap="sm">
            <Checkbox
              checked={specificChecked}
              data-testid={publishRecipientSpecific}
              id={`${id}-specific`}
              onCheckedChange={toggleSpecific}
            />
            <Label htmlFor={`${id}-specific`}>Specific people</Label>
          </Inline>
        ) : null}
      </Stack>

      {specificChecked ? (
        <Stack data-testid={publishRecipientSegments} gap="sm">
          <Text size="sm" weight="medium">
            Selection
          </Text>
          <LabelPicker
            labels={pickerLabels}
            optionSource={optionSource}
            placeholder="Search labels and tiers..."
            resolvedSelectedLabels={resolvedSelectedLabels}
            selectedSlugs={segments.specific}
            onToggle={toggleSegment}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
