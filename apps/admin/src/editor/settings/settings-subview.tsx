import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { SettingsNavigationRow } from './settings-navigation-row';
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
        <Box className="z-10 shrink-0 bg-sidebar">
          <Inline align="center" className="px-4 py-3" gap="sm">
            <Button
              ref={backRef}
              aria-label={closeLabel}
              className="hover:bg-sidebar-accent [&_svg]:stroke-2!"
              shape="pill"
              size="icon"
              variant="ghost"
              onClick={close}
            >
              <LucideIcon.ArrowLeft />
            </Button>
            <Text as="h2" className="flex-1" size="lg" weight="semibold">
              {title}
            </Text>
            <Box aria-hidden="true" className="size-(--editor-settings-toggle-width) shrink-0" />
          </Inline>
        </Box>
        <Stack
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-5 py-4 [&>*]:shrink-0',
            contentClassName,
          )}
          data-testid={settingsSubviewPane}
          gap="lg"
        >
          {children}
        </Stack>
      </>
    );
  }

  return (
    <SettingsNavigationRow ref={rowRef} icon={icon} onClick={() => show({ id, title })}>
      {label}
    </SettingsNavigationRow>
  );
}
