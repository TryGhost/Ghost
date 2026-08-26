import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  useNavigationMenuVisibility,
  useNavigationPreferences,
} from './app-sidebar/hooks/use-navigation-preferences';

export const AdminSidebarContext = createContext<{
  enabled: boolean;
  isSaving: boolean;
} | null>(null);
// Page layout only depends on eligibility, not saving or animation bookkeeping.
export const AdminSidebarLayoutContext = createContext(false);

// Only integrate screens with a header toggle. Other routes must retain an open
// sidebar until their headers provide a way to reopen it.
export function hasAdminSidebarToggle(pathname: string): boolean {
  return /^\/members(?:\/import)?\/?$/.test(pathname);
}

export function useAdminSidebar(pageChromeEnabled: boolean) {
  const location = useLocation();
  const { data: preferences } = useNavigationPreferences();
  const preferencesReady = preferences !== undefined;
  const [persistedVisible, saveVisible] = useNavigationMenuVisibility();
  const [pendingVisible, setPendingVisible] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [motion, setMotion] = useState<{ routeKey: string } | null>(null);
  const enabled = pageChromeEnabled && hasAdminSidebarToggle(location.pathname);
  const savedVisible = pendingVisible ?? persistedVisible;

  useEffect(() => {
    if (pendingVisible !== null && pendingVisible === persistedVisible) {
      setPendingVisible(null);
    }
  }, [pendingVisible, persistedVisible]);

  // A route, eligibility, or viewport change is not an explicit toggle. Snap,
  // including when a change interrupts a toggle already in flight.
  useEffect(() => {
    setMotion(null);
  }, [enabled, location.key]);

  useEffect(() => {
    const stopMotion = () => setMotion(null);
    window.addEventListener('resize', stopMotion);
    return () => window.removeEventListener('resize', stopMotion);
  }, []);

  useEffect(() => {
    if (motion === null) {
      return;
    }
    let cancelled = false;
    // CSS transitions start after React commits, not when the toggle is clicked.
    // Wait for the actual gap/panel motion instead of cutting it short with a
    // matching-duration timer. No animations (including reduced motion) settle
    // immediately; cleanup prevents an interrupted toggle finishing a newer one.
    const frame = window.requestAnimationFrame(() => {
      const animations = Array.from(
        layoutRef.current?.querySelectorAll('[data-sidebar="gap"], [data-sidebar="panel"]') ?? [],
      ).flatMap((element) => element.getAnimations());
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (!cancelled) {
          setMotion(null);
        }
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [motion]);

  const setOpen = useCallback(
    async (visible: boolean) => {
      if (!enabled || !preferencesReady || savingRef.current || visible === savedVisible) {
        return;
      }
      savingRef.current = true;
      setIsSaving(true);
      setMotion({ routeKey: location.key });
      setPendingVisible(visible);

      try {
        await saveVisible(visible);
      } catch {
        setMotion(null);
        setPendingVisible(null);
        toast.error("Couldn't save sidebar preference. Please try again.");
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [enabled, preferencesReady, savedVisible, location.key, saveVisible],
  );

  return {
    layoutRef,
    enabled,
    open: !enabled || savedVisible,
    isSaving: isSaving || !preferencesReady,
    animate: enabled && motion?.routeKey === location.key,
    setOpen,
  };
}
