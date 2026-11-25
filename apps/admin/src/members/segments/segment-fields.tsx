import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { Input, Label, Switch } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { useId } from 'react';

/** The longest segment name the API accepts, in characters. */
export const SEGMENT_NAME_MAX_LENGTH = 191;

/**
 * How many members a filter matches, as a sentence. For a place that builds conditions without
 * the members list in view, where the count is the only sign of who they match.
 */
export function MatchingMembers({ filter }: { filter: string | undefined }) {
  const { count } = useMembersCount(filter ?? null);

  if (!filter) {
    return (
      <Text size="sm" tone="secondary">
        Add a condition to choose who is in this segment.
      </Text>
    );
  }

  if (count === null) {
    return (
      <Text size="sm" tone="secondary">
        Counting members…
      </Text>
    );
  }

  return (
    <Text size="sm" tone="secondary">
      <Text as="span" size="sm" weight="semibold">
        {formatNumber(count)}
      </Text>{' '}
      {count === 1 ? 'member matches' : 'members match'}
    </Text>
  );
}

interface SegmentFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  /** Why the last save was refused, shown under the name. */
  error?: string;
  /** Called when Enter is pressed in the name. */
  onSubmit?: () => void;
  /**
   * Whether this place asks if the segment is pinned to the sidebar. Left out, the segment is
   * made without a shortcut and pinned later from its menu.
   */
  pin?: { pinned: boolean; onChange: (pinned: boolean) => void };
}

/**
 * The fields every place that makes a segment shares: its name and, where the place asks, whether
 * it is pinned to the sidebar. The conditions belong to the place: the members screen already has
 * them, and the new segment dialog edits them above these fields.
 */
export function SegmentFields({ name, onNameChange, error, onSubmit, pin }: SegmentFieldsProps) {
  const pinId = useId();

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Input
          aria-invalid={Boolean(error)}
          aria-label="Segment name"
          maxLength={SEGMENT_NAME_MAX_LENGTH}
          placeholder="Segment name"
          value={name}
          autoFocus
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit?.();
            }
          }}
        />
        {error && (
          <Text className="text-destructive" role="alert" size="xs">
            {error}
          </Text>
        )}
      </Stack>
      {pin && (
        <Inline align="center" gap="md" justify="between">
          <Label className="font-normal" htmlFor={pinId}>
            Pin in sidebar
          </Label>
          <Switch checked={pin.pinned} id={pinId} onCheckedChange={pin.onChange} />
        </Inline>
      )}
    </Stack>
  );
}
