import { type ReactNode } from 'react';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';

/** A titled part of the Security group, like "Single sign-on" or "Two-step verification". */
export function SecuritySubsection({
  title,
  badge,
  description,
  action,
  children,
}: {
  title: string;
  badge?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Stack gap="lg">
      <Inline align="start" gap="md" justify="between">
        <Stack gap="xs">
          <Inline gap="sm">
            <Text as="h3" size="lg" weight="semibold">
              {title}
            </Text>
            {badge}
          </Inline>
          {description && (
            <Text size="sm" tone="secondary">
              {description}
            </Text>
          )}
        </Stack>
        {action}
      </Inline>
      {children}
    </Stack>
  );
}
