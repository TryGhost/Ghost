import { Label, RadioGroup, RadioGroupItem } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { publishTypeError as publishTypeErrorTestId } from '@tryghost/test-data/selectors/editor';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { PublishOptionsState, PublishType } from '@/editor/publish/publish-options';

const MAILGUN_DOCS = 'https://docs.ghost.org/newsletters/#bulk-email-configuration';

export interface PublishTypeOptionsProps {
  state: PublishOptionsState;
  onChange: (publishType: PublishType) => void;
}

function NoNewsletterNote() {
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const automations = useFeatureFlag('automations', {
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  // Editors can open Settings, but only admins see its newsletters.
  const newsletters =
    currentUser && hasAdminAccess(currentUser) ? (
      <a className="underline" href={automations ? '#/settings/emails' : '#/settings/newsletters'}>
        newsletters
      </a>
    ) : (
      'newsletters'
    );

  return (
    <Text data-testid={publishTypeErrorTestId} size="sm">
      Email is unavailable because there are no active {newsletters}.
    </Text>
  );
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

  if (reason === 'no-newsletter') {
    return <NoNewsletterNote />;
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
