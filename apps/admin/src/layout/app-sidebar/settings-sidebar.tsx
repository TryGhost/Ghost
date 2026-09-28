import React, { useEffect, useState } from 'react';

import { Sidebar, SidebarContent } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';

const FADE_HEIGHT = 48;

function SettingsNavigationFade() {
  // Distance left to scroll, so the fade eases out as the last item arrives
  // instead of covering it at the bottom.
  const [remainingScroll, setRemainingScroll] = useState(0);

  useEffect(() => {
    let detach: (() => void) | undefined;
    let frameId: number | undefined;

    const attach = () => {
      const scroller = document.getElementById('settings-sidebar-scroller');
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

    const waitForScroller = () => {
      if (!attach()) {
        frameId = requestAnimationFrame(waitForScroller);
      }
    };

    waitForScroller();

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      detach?.();
    };
  }, []);

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
    return (
      <Sidebar
        ref={ref}
        className={cn('[&_[data-sidebar=sidebar]]:overflow-hidden', className)}
        data-testid="admin-sidebar"
        {...props}
      >
        <SidebarContent className="relative overflow-hidden px-5 pt-5 pb-0">
          <div ref={slotRef} className="flex min-h-0 flex-1 flex-col" />
          <SettingsNavigationFade />
        </SidebarContent>
      </Sidebar>
    );
  },
);

export default SettingsSidebar;
