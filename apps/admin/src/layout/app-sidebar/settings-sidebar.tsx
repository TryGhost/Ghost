import React, { useCallback, useEffect, useState } from 'react';

import { Sidebar, SidebarContent } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

const FADE_HEIGHT = 48;

function SettingsNavigationFade({ slot }: { slot: HTMLElement | null }) {
  const [remainingScroll, setRemainingScroll] = useState(0);

  useEffect(() => {
    if (!slot) {
      return;
    }

    let detach: (() => void) | undefined;

    const attach = () => {
      const scroller = slot.querySelector<HTMLElement>('#settings-sidebar-scroller');
      if (!scroller) {
        return false;
      }

      const updateVisibility = () => {
        setRemainingScroll(
          Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight),
        );
      };
      const mutationObserver = new MutationObserver(updateVisibility);
      const resizeObserver = new ResizeObserver(updateVisibility);

      updateVisibility();
      scroller.addEventListener('scroll', updateVisibility, { passive: true });
      mutationObserver.observe(scroller, { childList: true, subtree: true });
      resizeObserver.observe(scroller);
      detach = () => {
        scroller.removeEventListener('scroll', updateVisibility);
        mutationObserver.disconnect();
        resizeObserver.disconnect();
      };

      return true;
    };

    const slotObserver = new MutationObserver(() => {
      if (attach()) {
        slotObserver.disconnect();
      }
    });
    if (!attach()) {
      slotObserver.observe(slot, { childList: true, subtree: true });
    }

    return () => {
      slotObserver.disconnect();
      detach?.();
    };
  }, [slot]);

  if (remainingScroll <= 1) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-sidebar to-transparent"
      style={{ opacity: Math.min(1, remainingScroll / FADE_HEIGHT) }}
    />
  );
}

interface SettingsSidebarProps extends React.ComponentProps<typeof Sidebar> {
  slotRef: (element: HTMLDivElement | null) => void;
}

const SettingsSidebar = React.forwardRef<HTMLDivElement, SettingsSidebarProps>(
  function SettingsSidebar({ className, slotRef, ...props }, ref) {
    const [slot, setSlot] = useState<HTMLDivElement | null>(null);
    const handleSlotRef = useCallback(
      (element: HTMLDivElement | null) => {
        setSlot(element);
        slotRef(element);
      },
      [slotRef],
    );

    return (
      <Sidebar
        ref={ref}
        className={cn('[&_[data-sidebar=sidebar]]:overflow-hidden', className)}
        data-testid="admin-sidebar"
        {...props}
      >
        <SidebarContent className="relative overflow-hidden pt-5 pb-0">
          <Stack ref={handleSlotRef} className="min-h-0 flex-1" gap="none" />
          <SettingsNavigationFade slot={slot} />
        </SidebarContent>
      </Sidebar>
    );
  },
);

export default SettingsSidebar;
