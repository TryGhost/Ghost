import React from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

// State, timestamps and editing controls belong to the caller. Both canvases
// compose this surface and header without importing one another's state model.
export const AutomationCard = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Stack>>(
  function AutomationCard({ className, ...props }, ref) {
    return (
      <Stack
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-border-default bg-surface-elevated p-6 text-foreground shadow-sm',
          className,
        )}
        gap="md"
        role="article"
        {...props}
      />
    );
  },
);

export const AutomationCardHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconClassName?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
}> = ({ title, icon, iconClassName, description, actions, metadata }) => (
  <Inline gap="md" wrap={Boolean(metadata)}>
    <Inline className={cn('min-w-0 flex-1', metadata && 'min-w-[min(100%,10rem)]')} gap="md">
      <Box
        aria-hidden="true"
        className={cn('shrink-0 rounded-md bg-muted p-3 text-muted-foreground', iconClassName)}
      >
        {icon}
      </Box>
      <Stack className="min-w-0 flex-1" gap="xs">
        <Text as="h3" className="break-words" size="md" weight="medium">
          {title}
        </Text>
        {description}
      </Stack>
    </Inline>
    {actions}
    {metadata}
  </Inline>
);
