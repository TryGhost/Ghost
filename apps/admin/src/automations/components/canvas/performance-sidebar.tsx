import React, { useId, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

export const PerformanceSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
        onClick={() => setIsOpen((open) => !open)}
      >
        <LucideIcon.PanelLeft strokeWidth={2} />
      </Button>
      <aside
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
        className={cn(
          'max-w-[calc(100%-6rem)] shrink-0 overflow-hidden border-border-default bg-surface-elevated transition-[width] duration-150 ease-out motion-reduce:transition-none',
          isOpen ? 'w-[480px] border-r' : 'w-0',
        )}
        id={panelId}
      >
        <Box className="w-[480px] px-6 py-4">
          <Inline className="h-9 pl-10" gap="none">
            <Text as="h2" id={headingId} size="md" weight="semibold">
              Performance
            </Text>
          </Inline>
        </Box>
      </aside>
    </>
  );
};
