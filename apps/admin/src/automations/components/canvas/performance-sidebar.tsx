import React, { useId, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { TotalEntries } from './total-entries';

export const PerformanceSidebar: React.FC<{ automationId: string }> = ({ automationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const panelId = useId();
  const headingId = useId();

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide performance' : 'Show performance'}
        className="absolute top-4 left-4 z-10"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => {
          setHasOpened(true);
          setIsOpen((open) => !open);
        }}
      >
        <LucideIcon.PanelLeft strokeWidth={2} />
      </Button>
      <aside
        ref={(panel) => {
          if (panel) {
            panel.inert = !isOpen;
          }
        }}
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
        className={cn(
          'shrink-0 overflow-hidden bg-surface-elevated transition-[width] duration-150 ease-out motion-reduce:transition-none',
          isOpen ? 'w-[min(480px,calc(100cqw-6rem))]' : 'w-0',
        )}
        id={panelId}
      >
        {/* Size the content against the canvas, not the animated clipping panel. */}
        <Box className="h-full w-[min(480px,calc(100cqw-6rem))] overflow-y-auto border-r border-border-default px-6 py-4">
          <Inline className="h-9 pl-10" gap="none">
            <Text as="h2" id={headingId} size="md" weight="semibold">
              Performance
            </Text>
          </Inline>
          {hasOpened && (
            <Stack className="mt-4" gap="md">
              <TotalEntries automationId={automationId} />
            </Stack>
          )}
        </Box>
      </aside>
    </>
  );
};
