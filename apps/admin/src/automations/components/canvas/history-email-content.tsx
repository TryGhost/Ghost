import React from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { HistoryEmailPreview } from '@/automations/utils/history-email-preview';

const contentMessages = {
  empty: 'Email content is empty.',
  unavailable: 'Historical email content is unavailable.',
  no_text: 'No text preview is available for this content.',
};

export const HistoryEmailContent: React.FC<{ email: HistoryEmailPreview; planned?: boolean }> = ({
  email,
  planned = false,
}) => {
  const subject =
    email.subject === null ? 'Subject unavailable' : email.subject.trim() || 'No subject';
  return (
    <Stack gap="md">
      <Inline
        aria-label={planned ? 'Upcoming email subject' : 'Historical email subject'}
        className="min-w-0 rounded-md border border-border-default px-3 py-2"
        gap="sm"
        role="group"
      >
        <Text as="span" size="md" tone="secondary">
          Subject
        </Text>
        <Text as="span" className="min-w-0 truncate" size="md" title={subject}>
          {subject}
        </Text>
      </Inline>
      <Box
        aria-label={planned ? 'Upcoming email text preview' : 'Historical email text preview'}
        className="min-w-0 rounded-md border border-border-default p-4"
        role="region"
      >
        <Text className="line-clamp-6 break-words whitespace-pre-line" size="md" tone="secondary">
          {email.content.state === 'available'
            ? email.content.text
            : planned && email.content.state === 'unavailable'
              ? 'Upcoming email content is unavailable.'
              : contentMessages[email.content.state]}
        </Text>
      </Box>
    </Stack>
  );
};
