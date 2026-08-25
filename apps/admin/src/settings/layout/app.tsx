import MainContent from './main-content';
import { DirtyNavigationGuard } from './dirty-navigation-guard';
import SettingsAppProvider from '@/settings/providers/settings-app-provider';
import { type UpgradeStatusType } from '@/settings/providers/settings-app-context';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { DialogPortalProvider } from '@/settings/providers/dialog-portal';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { useEffect } from 'react';
import { useScrollSectionContext } from '@/settings/hooks/use-scroll-section';

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

export function App({ upgradeStatus }: AppProps) {
  return (
    <SettingsAppProvider upgradeStatus={upgradeStatus}>
      <div className="settings-app [--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]">
        <ConfirmationProvider>
          <DialogPortalProvider>
            <SettingsLocationSync />
            <MainContent />
            <Outlet />
            <DirtyNavigationGuard />
          </DialogPortalProvider>
        </ConfirmationProvider>
      </div>
    </SettingsAppProvider>
  );
}
