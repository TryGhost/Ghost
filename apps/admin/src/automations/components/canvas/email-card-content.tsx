import React from 'react';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

export const EmailCardContent: React.FC<{
  className?: string;
  subject?: React.ReactNode;
}> = ({ className, subject }) =>
  subject ? (
    <Stack className={className} gap="md">
      {subject}
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
