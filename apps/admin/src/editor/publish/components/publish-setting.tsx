import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { ReactNode } from 'react';

export interface PublishSettingProps {
  testId: string;
  icon: ReactNode;
  /** The collapsed summary line. */
  title: ReactNode;
  open?: boolean;
  /** A disabled row shows its summary and never expands. */
  disabled?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  /** Rendered under the row whether or not it is expanded (warnings, read-only notes). */
  footer?: ReactNode;
}

export function PublishSetting({
  testId,
  icon,
  title,
  open = false,
  disabled = false,
  onToggle,
  children,
  footer,
}: PublishSettingProps) {
  const interactive = !disabled && Boolean(onToggle);

  return (
    <Stack
      className="border-b border-border-default last:border-b-0"
      data-testid={testId}
      gap="none"
    >
      <button
        aria-expanded={interactive ? open : undefined}
        className={cn(
          'flex w-full items-center gap-3 px-1 py-4 text-left [&[aria-expanded=true]>svg]:rotate-180',
          disabled && 'cursor-default text-foreground/40',
        )}
        disabled={!interactive}
        type="button"
        onClick={onToggle}
      >
        <span className="shrink-0">{icon}</span>
        <Text className="grow text-inherit" size="lg" weight="medium">
          {title}
        </Text>
        <LucideIcon.ChevronDown className="size-4 shrink-0 transition-transform" />
      </button>
      {open && children ? (
        <Box className="pr-1 pb-5 pl-8 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in motion-safe:slide-in-from-top-1">
          {children}
        </Box>
      ) : null}
      {footer}
    </Stack>
  );
}

export function PublishSettingNote({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <Inline
      align="start"
      className="mb-4 rounded-md bg-surface-elevated p-3"
      data-testid={testId}
      gap="sm"
    >
      <Text size="sm">{children}</Text>
    </Inline>
  );
}
