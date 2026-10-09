import Sidebar from './sidebar';
import { DirtyNavigationGuard } from './dirty-navigation-guard';
import SettingsAppProvider from '@/settings/providers/settings-app-provider';
import { type UpgradeStatusType } from '@/settings/providers/settings-app-context';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { DialogPortalProvider } from '@/settings/providers/dialog-portal';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollSectionContext } from '@/settings/hooks/use-scroll-section';
import { useSettingsNavigationSlot } from '@/layout/settings-navigation';
import { SettingsLoading } from '@/settings/settings-loading';

import { useLazyComponent } from '@/shared/use-lazy-component';

// The sections are most of Settings' code; loading them separately lets the
// navigation show first.
const loadMainContent = () => import('./main-content');

interface AppProps {
  upgradeStatus?: UpgradeStatusType;
}

// Keeps the scroll-spy's navigated section in sync with the URL, replacing the
// legacy SettingsRouter.
function SettingsLocationSync() {
  const { pathname } = useLocation();
  const { updateNavigatedSection } = useScrollSectionContext();

  useEffect(() => {
    const route = pathname.replace(/^\/settings\/?/, '');
    updateNavigatedSection(route.split('/')[0]);
  }, [pathname, updateNavigatedSection]);

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
  const MainContent = useLazyComponent(loadMainContent);

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
