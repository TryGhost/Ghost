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
import { useId, useMemo, useState } from 'react';
import { LabelPicker } from '@/members/api';
import { type HybridValueSource, filterOptionsByQuery } from '@/shared/filter-sources';
import type { ComboboxOptionSource } from '@tryghost/shade/components';
import {
  publishRecipientFree,
  publishRecipientPaid,
  publishRecipientSegments,
  publishRecipientSpecific,
} from '@tryghost/test-data/selectors/editor';
import { parseRecipientLabelOptions } from './email-recipients-boundary';

const LABEL_SEGMENT_PREFIX = 'label:';
const TIER_SEGMENT_PREFIX = 'tier:';
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
  tierOptions: SegmentOption[];
  /** "Specific people" waits for the tiers, so a saved tier is never shown by its raw id. */
  tiersLoading: boolean;
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

function segmentSlug(segment: string): string {
  for (const prefix of [LABEL_SEGMENT_PREFIX, TIER_SEGMENT_PREFIX]) {
    if (segment.startsWith(prefix)) {
      return segment.slice(prefix.length);
    }
  }

  return segment;
}

interface SegmentRow {
  id: string;
  slug: string;
  name: string;
  group?: string;
}

function toRow(segment: string, name: string, group?: string): SegmentRow {
  return { id: segment, slug: segment, name, group };
}

interface SegmentPickerProps {
  tierOptions: SegmentOption[];
  tiersLoading: boolean;
  labelSource: HybridValueSource<string>;
  selected: string[];
  onToggle: (segment: string) => void;
}

/** Mounted only while "Specific people" is checked, so the search resets with it. */
function SegmentPicker({
  tierOptions,
  tiersLoading,
  labelSource,
  selected,
  onToggle,
}: SegmentPickerProps) {
  const [search, setSearch] = useState('');

  // The source names selected labels even when the page or search leaves them out.
  const selectedLabelSlugs = useMemo(
    () =>
      selected.flatMap((segment) => {
        const slug = labelSlug(segment);
        return slug === null ? [] : [slug];
      }),
    [selected],
  );
  const labelState = labelSource.useOptions({ query: search, selectedValues: selectedLabelSlugs });

  const tierRows = tierOptions.map((option) => toRow(option.segment, option.name, option.group));
  // The source searches labels itself, so only the tiers need narrowing here.
  const visibleTierRows = filterOptionsByQuery(
    tierRows.map((row) => ({ value: row, label: row.name })),
    search,
  ).map((option) => option.value);
  const labelRows = parseRecipientLabelOptions(labelState.options).map((option) =>
    toRow(`${LABEL_SEGMENT_PREFIX}${option.value}`, option.label, LABELS_GROUP),
  );

  // Pills are named from every known row, not only those matching the search.
  // A tier segment waits for the tiers rather than showing its raw id first.
  const knownRows = [...tierRows, ...labelRows];
  const selectedRows = selected.flatMap((segment) => {
    const row = knownRows.find((known) => known.slug === segment);
    if (row) {
      return [row];
    }
    if (tiersLoading && labelSlug(segment) === null) {
      return [];
    }
    return [toRow(segment, segmentSlug(segment))];
  });

  const optionSource: ComboboxOptionSource<string> = {
    ...labelState,
    isInitialLoad: tiersLoading || labelState.isInitialLoad,
    shouldClientFilter: false,
    onSearchChange: setSearch,
  };

  return (
    <LabelPicker
      labels={[...visibleTierRows, ...labelRows]}
      optionSource={optionSource}
      placeholder="Search labels and tiers..."
      resolvedSelectedLabels={selectedRows}
      selectedSlugs={selected}
      onToggle={onToggle}
    />
  );
}

/**
 * Free/paid checkboxes plus an optional "Specific people" segment selection,
 * all expressed as one NQL recipient filter.
 */
export function RecipientSelect({
  filter,
  newsletterRecipientFilter,
  paidAvailable,
  tierOptions,
  tiersLoading,
  labelSource,
  onChange,
}: RecipientSelectProps) {
  const id = useId();
  const segments = useMemo(() => {
    const parsed = parseRecipientFilter(filter);
    const canonicalSegment = (segment: string) =>
      tierOptions.find((option) => option.aliases?.includes(segment))?.segment ?? segment;

    return {
      ...parsed,
      specific: [...new Set(parsed.specific.map(canonicalSegment))],
    };
  }, [filter, tierOptions]);
  // Remembers a selection across an off/on toggle, and keeps the picker open
  // when "Specific people" is checked with nothing selected yet.
  const [forceSpecific, setForceSpecific] = useState(false);
  const [previousSpecific, setPreviousSpecific] = useState<string[] | null>(null);

  const hasLabels = (labelSource.probe.total ?? 0) > 0;
  const hasSpecificOptions = !tiersLoading && (tierOptions.length > 0 || hasLabels);

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
          <SegmentPicker
            labelSource={labelSource}
            selected={segments.specific}
            tierOptions={tierOptions}
            tiersLoading={tiersLoading}
            onToggle={toggleSegment}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
