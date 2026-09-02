import { Label, RadioGroup, RadioGroupItem } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { publishTypeError as publishTypeErrorTestId } from '@tryghost/test-data/selectors/editor';
import type { PublishOptionsState, PublishType } from '@/editor/publish/publish-options';

const MAILGUN_DOCS = 'https://docs.ghost.org/newsletters/#bulk-email-configuration';

export interface PublishTypeOptionsProps {
  state: PublishOptionsState;
  onChange: (publishType: PublishType) => void;
}

function EmailUnavailableNote({ state }: { state: PublishOptionsState }) {
  const reason = state.emailDisabledReason;

  if (reason === 'sending-limit' || reason === 'email-verification') {
    return (
      <Text data-testid={publishTypeErrorTestId} size="sm">
        {state.emailBlock?.message}
      </Text>
    );
  }

  if (reason === 'no-members') {
    return (
      <Text data-testid={publishTypeErrorTestId} size="sm">
        <a className="underline" href="#/members">
          Add members
        </a>{' '}
        to start sending newsletters!
      </Text>
    );
  }

  if (reason === 'no-mailgun') {
    return (
      <Text data-testid={publishTypeErrorTestId} size="sm">
        Set up{' '}
        <a className="underline" href={MAILGUN_DOCS} rel="noreferrer noopener" target="_blank">
          Mailgun
        </a>{' '}
        to start sending newsletters!
      </Text>
    );
  }

  return null;
}

export function PublishTypeOptions({ state, onChange }: PublishTypeOptionsProps) {
  return (
    <Stack gap="md">
      <RadioGroup
        value={state.publishType}
        onValueChange={(value) => onChange(value as PublishType)}
      >
        {state.publishTypeOptions.map((option) => (
          <Inline key={option.value} gap="sm">
            <RadioGroupItem
              disabled={option.disabled}
              id={`publish-type-${option.value}`}
              value={option.value}
            />
            <Label htmlFor={`publish-type-${option.value}`}>{option.label}</Label>
          </Inline>
        ))}
      </RadioGroup>
      <EmailUnavailableNote state={state} />
    </Stack>
  );
}
