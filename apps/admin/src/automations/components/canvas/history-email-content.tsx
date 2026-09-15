import React from 'react';
import { Text } from '@tryghost/shade/primitives';
import type { HistoryEmailPreview } from '@/automations/utils/history-email-preview';
import {
  EmailCardContent,
  EmailCardExcerpt,
  EmailCardMessage,
  EmailCardSubject,
} from './email-card-content';

export const HistoryEmailContent: React.FC<{ email: HistoryEmailPreview; planned?: boolean }> = ({
  email,
  planned = false,
}) => {
  const subject = email.subject?.trim();
  const content = email.content.state === 'available' ? email.content.text : null;
  return (
    <EmailCardContent
      message={
        content && (
          <EmailCardMessage
            aria-label={planned ? 'Upcoming email text preview' : 'Historical email text preview'}
          >
            <EmailCardExcerpt>{content}</EmailCardExcerpt>
          </EmailCardMessage>
        )
      }
      subject={
        subject && (
          <EmailCardSubject
            aria-label={planned ? 'Upcoming email subject' : 'Historical email subject'}
          >
            <Text as="span" size="md" tone="secondary">
              Subject
            </Text>
            <Text as="span" className="min-w-0 truncate" size="md" title={subject}>
              {subject}
            </Text>
          </EmailCardSubject>
        )
      }
    />
  );
};
