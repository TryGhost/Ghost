import React from 'react';
import { inputSurfaceClasses } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import {
  EmailCardContent,
  EmailCardSubject,
  EmailCardMessage,
  EmailCardExcerpt,
} from './email-card-content';

import type { HistoryEmail } from '@/automations/utils/run-history';

export const HistoryEmailContent: React.FC<{
  email: HistoryEmail;
  planned?: boolean;
  // SHAPING PROTOTYPE ONLY: one box like the editor's email preview, read-only.
  editorStyle?: boolean;
}> = ({ email, planned = false, editorStyle = false }) => {
  const subject = email.subject?.trim();
  if (editorStyle) {
    if (!subject && !email.text) {
      return null;
    }
    return (
      <EmailCardMessage
        aria-label={planned ? 'Upcoming email preview' : 'Historical email preview'}
        className={cn(inputSurfaceClasses.base, 'p-5')}
      >
        {subject && (
          <span className="mb-2 block truncate text-md font-medium" title={subject}>
            {subject}
          </span>
        )}
        {email.text && (
          <EmailCardExcerpt className="line-clamp-4 text-[length:var(--text-control)] text-muted-foreground">
            {email.text}
          </EmailCardExcerpt>
        )}
      </EmailCardMessage>
    );
  }
  return (
    <EmailCardContent
      message={
        email.text && (
          <EmailCardMessage
            aria-label={planned ? 'Upcoming email text preview' : 'Historical email text preview'}
          >
            <EmailCardExcerpt>{email.text}</EmailCardExcerpt>
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
