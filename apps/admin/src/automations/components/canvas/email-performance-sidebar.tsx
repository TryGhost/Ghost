import React, { useEffect, useRef, useState } from 'react';
import type { AutomationSendEmailAction } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { EmailPerformanceSection } from './email-performance-section';

export const EmailPerformanceSidebar: React.FC<{
  automationId: string;
  email?: AutomationSendEmailAction;
  suspended: boolean;
  onClose: () => void;
}> = ({ automationId, email, suspended, onClose }) => {
  const panel = useRef<HTMLElement | null>(null);
  // Keep the last email visible during the closing transition, then unmount its queries.
  const [closingEmail, setClosingEmail] = useState(email);
  const displayedEmail = email ?? closingEmail;
  useEffect(() => {
    if (email || suspended || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setClosingEmail(email);
    }
  }, [email, suspended]);
  const clearClosedEmail = (event: React.TransitionEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'width' && !email) {
      setClosingEmail(undefined);
    }
  };
  useEffect(() => {
    if (!email || suspended) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        onClose();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      // Analytics toggles and the insertion picker own their interaction. Picking
      // a step closes the panel through the canvas, after insertion completes.
      if (
        target instanceof Element &&
        target.closest('[data-email-analytics-toggle], [data-automation-step-picker]')
      ) {
        return;
      }
      if (target instanceof Node && !panel.current?.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [email, suspended, onClose]);

  return (
    <aside
      ref={(element) => {
        panel.current = element;
        if (element) {
          element.inert = !email || suspended;
        }
      }}
      aria-hidden={!email || suspended}
      aria-label="Email performance"
      className={cn(
        'absolute inset-y-0 right-0 z-10 shrink-0 overflow-hidden transition-[width] duration-150 ease-out motion-reduce:transition-none @min-[880px]/automation:relative',
        email ? 'w-[min(400px,calc(100cqw-6rem))]' : 'pointer-events-none w-0',
        suspended && 'hidden',
      )}
      data-state={email ? 'open' : 'closed'}
      onTransitionEnd={clearClosedEmail}
    >
      {displayedEmail && (
        <Box className="h-full w-[min(400px,calc(100cqw-6rem))] overflow-y-auto border-l border-border-default bg-surface-elevated shadow-sm">
          <Inline className="sticky top-0 z-10 bg-surface-elevated p-6" gap="md">
            <Box className="shrink-0 rounded-md bg-muted p-2.5">
              <LucideIcon.MailOpen className="size-4" />
            </Box>
            <Text as="h2" className="min-w-0 flex-1" size="md" weight="medium" truncate>
              {displayedEmail.data.email_subject || 'Untitled'}
            </Text>
            <Button
              aria-label="Close email performance"
              size="icon"
              variant="ghost"
              onClick={onClose}
            >
              <LucideIcon.X />
            </Button>
          </Inline>
          <Box className="px-6 pb-6">
            {displayedEmail.stats ? (
              <EmailPerformanceSection
                key={displayedEmail.id}
                actionId={displayedEmail.id}
                automationId={automationId}
                stats={displayedEmail.stats}
                redesigned
              />
            ) : (
              <Text size="sm" tone="secondary">
                Email performance is unavailable.
              </Text>
            )}
          </Box>
        </Box>
      )}
    </aside>
  );
};
