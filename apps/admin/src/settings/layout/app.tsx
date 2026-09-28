import MainContent from './main-content';
import Sidebar from './sidebar';
import { DirtyNavigationGuard } from './dirty-navigation-guard';
import SettingsAppProvider from '@/settings/providers/settings-app-provider';
import { type UpgradeStatusType } from '@/settings/providers/settings-app-context';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { DialogPortalProvider } from '@/settings/providers/dialog-portal';
import { Outlet, useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useSidebar } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollSectionContext } from '@/settings/hooks/use-scroll-section';
import { useSettingsNavigationSlot } from '@/layout/settings-navigation';

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
  const { isMobile, setOpenMobile } = useSidebar();

  // The nav renders outside .settings-app, so it re-applies that scope's styles.
  return (
    <div className="settings-app flex min-h-0 flex-1 flex-col [--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]">
      <Sidebar
        autoFocusSearch={!isMobile}
        onNavigate={isMobile ? () => setOpenMobile(false) : undefined}
      />
    </div>
  );
}

function SettingsNavigationPortal() {
  const container = useSettingsNavigationSlot();

  // The slot only exists inside the shell's SidebarProvider, so the navigation
  // can rely on useSidebar once it has a container.
  return container ? createPortal(<SettingsNavigation />, container) : null;
}

export function App({ upgradeStatus }: AppProps) {
  const admin7Settings = useFeatureFlag('admin7settings');

  return (
    <SettingsAppProvider upgradeStatus={upgradeStatus}>
      <div
        className={cn(
          'settings-app [--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]',
          admin7Settings && 'h-full min-h-0',
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
