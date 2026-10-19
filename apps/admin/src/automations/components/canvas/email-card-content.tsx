import React from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

export const EmailCardContent: React.FC<{
  className?: string;
  subject?: React.ReactNode;
  message?: React.ReactNode;
}> = ({ className, subject, message }) =>
  subject || message ? (
    <Stack className={className} gap="md">
      {subject}
      {message}
    </Stack>
  ) : null;

export const EmailCardSubject = ({ className, ...props }: React.ComponentProps<typeof Inline>) => (
  <Inline
    className={cn('min-w-0 rounded-md border border-border-default px-3 py-2', className)}
    gap="sm"
    role="group"
    {...props}
  />
);

export const EmailCardMessage = ({ className, ...props }: React.ComponentProps<typeof Box>) => (
  <Box
    className={cn('min-w-0 rounded-md border border-border-default p-4', className)}
    role="region"
    {...props}
  />
);

export const EmailCardExcerpt: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Text
    className={cn('line-clamp-6 break-words whitespace-pre-line', className)}
    size="md"
    tone="secondary"
  >
    {children}
  </Text>
);
