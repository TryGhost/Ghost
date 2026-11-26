import { Field, FieldError, FieldGroup, Input } from '@tryghost/shade/components';

/** The longest segment name the API accepts, in characters. */
export const SEGMENT_NAME_MAX_LENGTH = 191;

interface SegmentFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  /** Why the last save was refused, shown under the name. */
  error?: string;
  /** Called when Enter is pressed in the name. */
  onSubmit?: () => void;
}

/**
 * A segment's name: the field of the small forms that have a title of their own, which is why
 * the name has no label here. It is Shade's field components, as the custom field form's are.
 */
export function SegmentFields({ name, onNameChange, error, onSubmit }: SegmentFieldsProps) {
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
    </FieldGroup>
  );
}
