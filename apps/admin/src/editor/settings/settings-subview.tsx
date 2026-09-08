import { type ReactNode, useEffect, useRef } from 'react';
import { Button, Separator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { settingsSubviewPane } from '@tryghost/test-data/selectors/editor';
import type { SettingsSectionId } from './sections';
import { useSubviews } from './settings-subview-context';

export interface SettingsSubviewProps {
  /** The section's own id: the panel shows this section alone while its pane is open. */
  id: SettingsSectionId;
  icon: ReactNode;
  /** The row in the section list, and the accessible name of the button that opens the pane. */
  label: string;
  /** The pane's heading, which also names the panel while the pane is open. */
  title: string;
  /** The accessible name of the pane's back button. */
  closeLabel: string;
  wide?: boolean;
  /** Overrides the pane body's default padding, for a pane that runs full-bleed. */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * A section that opens a pane over the rest of the panel: the row while it is
 * closed, the pane with its own header while it is open.
 */
export function SettingsSubview({
  id,
  icon,
  label,
  title,
  closeLabel,
  wide = false,
  contentClassName,
  children,
}: SettingsSubviewProps) {
  const { open, show, close } = useSubviews();
  const isOpen = open?.id === id;
  const backRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Opening moves the writer into the pane; closing puts them back on the row
  // they opened it from, rather than at the top of the document.
  useEffect(() => {
    if (isOpen) {
      backRef.current?.focus();
    } else if (wasOpen.current) {
      rowRef.current?.focus();
    }

    wasOpen.current = isOpen;
  }, [isOpen]);

  if (isOpen) {
    return (
      <>
        <div className="sticky top-0 z-10 bg-background">
          <Inline align="center" className="p-3" gap="sm">
            <Button ref={backRef} aria-label={closeLabel} size="sm" variant="ghost" onClick={close}>
              <LucideIcon.ArrowLeft />
            </Button>
            <Text as="h2" size="md" weight="semibold">
              {title}
            </Text>
          </Inline>
          <Separator />
        </div>
        <Stack
          className={cn('px-5 py-4', contentClassName)}
          data-testid={settingsSubviewPane}
          gap="lg"
        >
          {children}
        </Stack>
      </>
    );
  }

  return (
    <>
      <button
        ref={rowRef}
        className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-interactive-hover focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden [&>svg]:size-4 [&>svg]:shrink-0"
        type="button"
        onClick={() => show({ id, title, wide })}
      >
        {icon}
        <Text as="span" className="flex-1" size="sm">
          {label}
        </Text>
        <LucideIcon.ChevronRight className="size-4 shrink-0 text-text-tertiary" />
      </button>
      <Separator />
    </>
  );
}
