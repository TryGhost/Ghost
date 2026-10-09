import MainContent from './main-content';
import Sidebar from './sidebar';
import { DirtyNavigationGuard } from './dirty-navigation-guard';
import SettingsAppProvider from '@/settings/providers/settings-app-provider';
import { type UpgradeStatusType, useSearch } from '@/settings/providers/settings-app-context';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { DialogPortalProvider } from '@/settings/providers/dialog-portal';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollSectionContext } from '@/settings/hooks/use-scroll-section';
import { useSettingsNavigationSlot } from '@/layout/settings-navigation';

interface AppProps {
  upgradeStatus?: UpgradeStatusType;
}

const sectionOf = (pathname: string) => pathname.replace(/^\/settings\/?/, '').split('/')[0];

// Keeps the scroll-spy's navigated section in sync with the URL. Like a sidebar
// click, moving to another section or revisiting the path clears the filter.
function SettingsLocationSync() {
  const { key, pathname, search } = useLocation();
  const { updateNavigatedSection, scrollToSection } = useScrollSectionContext();
  const { setFilter, setNoResult } = useSearch();
  const previous = useRef({ key, pathname, search });
  // a same-path visit doesn't change the navigated section, so it scrolls once the filter clears
  const [rescroll, setRescroll] = useState<{ section: string }>();

  useEffect(() => {
    updateNavigatedSection(sectionOf(pathname));
  }, [pathname, updateNavigatedSection]);

  useEffect(() => {
    const last = previous.current;
    previous.current = { key, pathname, search };

    const isRevisit = key !== last.key && pathname === last.pathname && search === last.search;
    if (isRevisit || sectionOf(pathname) !== sectionOf(last.pathname)) {
      setFilter('');
      setNoResult(false);
    }
    if (isRevisit) {
      setRescroll({ section: sectionOf(pathname) });
    }
  }, [key, pathname, search, setFilter, setNoResult]);

  useEffect(() => {
    if (rescroll) {
      scrollToSection(rescroll.section);
      setRescroll(undefined);
    }
  }, [rescroll, scrollToSection]);

  return null;
}

function SettingsNavigation() {
  return (
    <Stack className="settings-app min-h-0 flex-1" gap="none">
      <Sidebar />
    </Stack>
  );
}

function SettingsNavigationPortal() {
  const container = useSettingsNavigationSlot();

  return container ? createPortal(<SettingsNavigation />, container) : null;
}

export function App({ upgradeStatus }: AppProps) {
  const admin7Settings = useFeatureFlag('admin7settings');

  return (
    <SettingsAppProvider upgradeStatus={upgradeStatus}>
      <div
        className={cn(
          'settings-app',
          admin7Settings && 'h-full min-h-0',
          !admin7Settings &&
            '[--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]',
        )}
      >
        <ConfirmationProvider>
          <DialogPortalProvider>
            <SettingsLocationSync />
            {admin7Settings && <SettingsNavigationPortal />}
            <MainContent />
            <Outlet />
            <DirtyNavigationGuard />
          </DialogPortalProvider>
        </ConfirmationProvider>
      </div>
    </SettingsAppProvider>
  );
}
