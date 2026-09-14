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
import { useState } from 'react';
import {
  publishRecipientFree,
  publishRecipientPaid,
  publishRecipientSegments,
  publishRecipientSpecific,
} from '@tryghost/test-data/selectors/editor';

export interface SegmentOption {
  /** The NQL segment, e.g. `tier:gold` or `label:vip`. */
  segment: string;
  name: string;
}

export interface RecipientSelectProps {
  filter: string | null;
  /** The newsletter's own audience filter, used to scope the free/paid counts. */
  newsletterRecipientFilter: string | null;
  paidAvailable: boolean;
  segmentOptions: SegmentOption[];
  onChange: (filter: string | null) => void;
}

function SegmentCount({ filter }: { filter: string | null }) {
  const { count } = useMembersCount(filter, { requestOptions: EDITOR_REQUEST_OPTIONS });

  if (count === null) {
    return null;
  }

  return (
    <Text as="span" size="sm" tone="secondary">
      ({formatNumber(count)})
    </Text>
  );
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
  segmentOptions,
  onChange,
}: RecipientSelectProps) {
  const segments = parseRecipientFilter(filter);
  // Remembers a selection across an off/on toggle, and keeps the picker open
  // when "Specific people" is checked with nothing selected yet.
  const [forceSpecific, setForceSpecific] = useState(false);
  const [previousSpecific, setPreviousSpecific] = useState<string[] | null>(null);

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
            id="recipients-free"
            onCheckedChange={() => toggleBase(FREE_SEGMENT)}
          />
          <Label htmlFor="recipients-free">
            Free <SegmentCount filter={scopedFilter(FREE_SEGMENT)} />
          </Label>
        </Inline>

        {paidAvailable ? (
          <Inline gap="sm">
            <Checkbox
              checked={segments.paid}
              data-testid={publishRecipientPaid}
              id="recipients-paid"
              onCheckedChange={() => toggleBase(PAID_SEGMENT)}
            />
            <Label htmlFor="recipients-paid">
              Paid <SegmentCount filter={scopedFilter(PAID_SEGMENT)} />
            </Label>
          </Inline>
        ) : null}

        {segmentOptions.length > 0 ? (
          <Inline gap="sm">
            <Checkbox
              checked={specificChecked}
              data-testid={publishRecipientSpecific}
              id="recipients-specific"
              onCheckedChange={toggleSpecific}
            />
            <Label htmlFor="recipients-specific">Specific people</Label>
          </Inline>
        ) : null}
      </Stack>

      {specificChecked ? (
        <Stack data-testid={publishRecipientSegments} gap="sm">
          <Text size="sm" weight="medium">
            Selection
          </Text>
          {segmentOptions.map((option) => (
            <Inline key={option.segment} gap="sm">
              <Checkbox
                checked={segments.specific.includes(option.segment)}
                id={`recipients-${option.segment}`}
                onCheckedChange={() => toggleSegment(option.segment)}
              />
              <Label htmlFor={`recipients-${option.segment}`}>{option.name}</Label>
            </Inline>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
