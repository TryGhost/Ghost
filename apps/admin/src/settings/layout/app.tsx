import Sidebar from './sidebar';
import { DirtyNavigationGuard } from './dirty-navigation-guard';
import SettingsAppProvider from '@/settings/providers/settings-app-provider';
import {
  type UpgradeStatusType,
  useOpenSectionRequest,
  useSearch,
} from '@/settings/providers/settings-app-context';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { DialogPortalProvider } from '@/settings/providers/dialog-portal';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollSectionContext } from '@/settings/hooks/use-scroll-section';
import { isOpenSectionRequest } from '@/settings/utils/open-section';
import { useSettingsNavigationSlot } from '@/layout/settings-navigation';
import { SettingsLoading } from '@/settings/settings-loading';

import { useLazyComponent } from '@/shared/use-lazy-component';
import { loadSettingsContent } from '@/settings/load-settings';

interface AppProps {
  upgradeStatus?: UpgradeStatusType;
}

const sectionOf = (pathname: string) => pathname.replace(/^\/settings\/?/, '').split('/')[0];

// history entries whose open request has run, so going back to one doesn't reopen it
const handledOpenRequests = new Set<string>();

// Keeps the scroll-spy's navigated section in sync with the URL. An `?open` link
// also clears the sidebar filter so its section shows, then asks it to open.
function SettingsLocationSync() {
  const { key, pathname, search } = useLocation();
  const { updateNavigatedSection } = useScrollSectionContext();
  const { filter, setFilter, setNoResult } = useSearch();
  const { setOpenSectionRequest } = useOpenSectionRequest();
  const [pendingSection, setPendingSection] = useState<string>();

  useEffect(() => {
    updateNavigatedSection(sectionOf(pathname));
  }, [pathname, updateNavigatedSection]);

  useEffect(() => {
    if (!isOpenSectionRequest(search) || handledOpenRequests.has(key)) {
      return;
    }

    handledOpenRequests.add(key);
    setFilter('');
    setNoResult(false);
    setPendingSection(sectionOf(pathname));
  }, [key, pathname, search, setFilter, setNoResult]);

  // asked only once the cleared filter has rendered, so a section reacting to it can't undo the open
  useEffect(() => {
    if (pendingSection && !filter) {
      setOpenSectionRequest({ section: pendingSection });
      setPendingSection(undefined);
    }
  }, [filter, pendingSection, setOpenSectionRequest]);

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
  const MainContent = useLazyComponent(loadSettingsContent);

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
            {MainContent ? <MainContent /> : <SettingsLoading />}
            <Outlet />
            <DirtyNavigationGuard />
          </DialogPortalProvider>
        </ConfirmationProvider>
      </div>
    </SettingsAppProvider>
  );
}
