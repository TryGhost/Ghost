import React from 'react';
import { Text } from '@tryghost/shade/primitives';
import {
  EmailCardContent,
  EmailCardSubject,
  EmailCardMessage,
  EmailCardExcerpt,
} from './email-card-content';

import type { HistoryEmail } from '@/automations/utils/run-history';

export const HistoryEmailContent: React.FC<{ email: HistoryEmail }> = ({ email }) => {
  const subject = email.subject?.trim();
  return (
    <EmailCardContent
      message={
        email.text && (
          <EmailCardMessage aria-label="Historical email text preview">
            <EmailCardExcerpt>{email.text}</EmailCardExcerpt>
          </EmailCardMessage>
        )
      }
      subject={
        subject && (
          <EmailCardSubject aria-label="Historical email subject">
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
