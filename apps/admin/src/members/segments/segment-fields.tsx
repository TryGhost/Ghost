import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Switch,
} from '@tryghost/shade/components';
import { useId } from 'react';

/** The longest segment name the API accepts, in characters. */
export const SEGMENT_NAME_MAX_LENGTH = 191;

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
 * A segment's name and, where the place asks, whether it is pinned to the sidebar: the fields of
 * the small forms that have a title of their own, which is why the name has no label here. They
 * are Shade's field components, as the custom field form's are.
 */
export function SegmentFields({ name, onNameChange, error, onSubmit, pin }: SegmentFieldsProps) {
  const pinId = useId();

  return (
    <FieldGroup className="gap-3">
      <Field data-invalid={Boolean(error) || undefined}>
        <Input
          aria-invalid={Boolean(error) || undefined}
          aria-label="Segment name"
          autoComplete="off"
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
        {error && <FieldError>{error}</FieldError>}
      </Field>
      {pin && (
        <Field orientation="horizontal">
          <FieldLabel className="font-normal" htmlFor={pinId}>
            Pin in sidebar
          </FieldLabel>
          <Switch checked={pin.pinned} id={pinId} onCheckedChange={pin.onChange} />
        </Field>
      )}
    </FieldGroup>
  );
}
