import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { getRecipientType } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { useState } from 'react';
import {
  publishAlreadySent,
  publishContinueButton,
  publishEmailSizeWarning,
  publishFlowOptions,
  publishSettingEmailRecipients,
  publishSettingPublishAt,
  publishSettingPublishType,
} from '@tryghost/test-data/selectors/editor';
import { EmailRecipientsOptions } from './email-recipients-options';
import { PublishAtOptions } from './publish-at-options';
import { PublishSetting, PublishSettingNote } from './publish-setting';
import { PublishTypeOptions } from './publish-type-options';
import { recipientsRowLabel, relativeTime } from '@/editor/publish/publish-copy';
import type {
  NewsletterInput,
  PublishOptionsState,
  PublishType,
} from '@/editor/publish/publish-options';
import type { PublishFlowPost } from '@/editor/publish/flow-post';

type Section = 'publishType' | 'emailRecipients' | 'publishAt';

export interface OptionsStepProps {
  post: PublishFlowPost;
  state: PublishOptionsState;
  timezone: string;
  /** True when the site turned newsletters off; hides the historic send row. */
  emailDisabledInSettings: boolean;
  onSetPublishType: (publishType: PublishType) => void;
  onSetNewsletter: (newsletter: NewsletterInput | null) => void;
  onSetRecipientFilter: (filter: string | null) => void;
  onToggleScheduled: (isScheduled: boolean) => void;
  onSetScheduledAt: (date: Date) => void;
  onContinue: () => void;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function RecipientsRowTitle({ state }: { state: PublishOptionsState }) {
  const { count } = useMembersCount(state.fullRecipientFilter);

  if (!state.recipientFilter) {
    return <>Not sent as newsletter</>;
  }

  return (
    <>
      {recipientsRowLabel({
        recipientType: getRecipientType(state.recipientFilter),
        count,
        newsletterName: state.onlyDefaultNewsletter ? null : (state.newsletter?.name ?? null),
      })}
    </>
  );
}

export function OptionsStep({
  post,
  state,
  timezone,
  emailDisabledInSettings,
  onSetPublishType,
  onSetNewsletter,
  onSetRecipientFilter,
  onToggleScheduled,
  onSetScheduledAt,
  onContinue,
}: OptionsStepProps) {
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const toggle = (section: Section) => () =>
    setOpenSection((current) => (current === section ? null : section));

  const publishBlocked = state.publishBlock !== null;
  const selectedType = state.publishTypeOptions.find(
    (option) => option.value === state.publishType,
  );
  const historicEmail = post.email;

  return (
    <Stack data-testid={publishFlowOptions} gap="xl">
      <Stack gap="none">
        <Text as="h2" className="text-state-success" size="3xl" weight="bold">
          Ready, set, publish.
        </Text>
        <Text size="3xl" weight="bold">
          Share it with the world.
        </Text>
      </Stack>

      <Stack gap="none">
        <PublishSetting
          disabled={state.emailUnavailable || publishBlocked}
          footer={
            state.willEmail ? (
              // The size estimate lands with the email-size-warning port; the
              // slot keeps its place in the layout until then.
              <div data-testid={publishEmailSizeWarning} hidden />
            ) : null
          }
          icon={<LucideIcon.Send className="size-4" />}
          open={openSection === 'publishType'}
          testId={publishSettingPublishType}
          title={
            state.emailUnavailable || publishBlocked
              ? 'Publish on site'
              : (selectedType?.display ?? 'Publish')
          }
          onToggle={toggle('publishType')}
        >
          <PublishTypeOptions state={state} onChange={onSetPublishType} />
        </PublishSetting>

        {publishBlocked ? (
          <PublishSettingNote>{state.publishBlock?.message}</PublishSettingNote>
        ) : null}

        {state.emailUnavailable ? null : (
          <PublishSetting
            disabled={state.publishType === 'publish' || publishBlocked}
            icon={<LucideIcon.Users className="size-4" />}
            open={openSection === 'emailRecipients'}
            testId={publishSettingEmailRecipients}
            title={
              state.publishType === 'publish' || publishBlocked ? (
                'Not sent as newsletter'
              ) : (
                <RecipientsRowTitle state={state} />
              )
            }
            onToggle={toggle('emailRecipients')}
          >
            <EmailRecipientsOptions
              state={state}
              onSetNewsletter={onSetNewsletter}
              onSetRecipientFilter={onSetRecipientFilter}
            />
          </PublishSetting>
        )}

        {historicEmail && !emailDisabledInSettings ? (
          <PublishSetting
            icon={<LucideIcon.Users className="size-4" />}
            testId={publishAlreadySent}
            title={[
              historicEmail.status === 'failed' ? 'Retry sending to' : 'Already sent to',
              formatNumber(historicEmail.email_count ?? 0),
              historicEmail.email_count === 1 ? 'subscriber' : 'subscribers',
              state.onlyDefaultNewsletter || !post.newsletterName
                ? null
                : `of ${post.newsletterName}`,
            ]
              .filter(Boolean)
              .join(' ')}
            disabled
          />
        ) : null}

        <PublishSetting
          disabled={publishBlocked}
          icon={<LucideIcon.Clock className="size-4" />}
          open={openSection === 'publishAt'}
          testId={publishSettingPublishAt}
          title={state.isScheduled ? capitalize(relativeTime(state.scheduledAt)) : 'Right now'}
          onToggle={toggle('publishAt')}
        >
          <PublishAtOptions
            state={state}
            timezone={timezone}
            onSetScheduledAt={onSetScheduledAt}
            onToggleScheduled={onToggleScheduled}
          />
        </PublishSetting>
      </Stack>

      {publishBlocked ? null : (
        <div>
          <Button data-testid={publishContinueButton} size="lg" onClick={onContinue}>
            Continue, final review &rarr;
          </Button>
        </div>
      )}
    </Stack>
  );
}
