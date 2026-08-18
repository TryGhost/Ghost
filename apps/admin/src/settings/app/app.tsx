import MainContent from './main-content';
import SettingsAppProvider, {type UpgradeStatusType} from './components/providers/settings-app-provider';
import {ConfirmationProvider} from './components/providers/confirmation-provider';
import {DialogPortalProvider} from './components/providers/dialog-portal';
import {Outlet, useLocation} from '@tryghost/admin-x-framework';
import {useEffect} from 'react';
import {useScrollSectionContext} from './hooks/use-scroll-section';

interface AppProps {
    upgradeStatus?: UpgradeStatusType;
}

// Keeps the scroll-spy's navigated section in sync with the URL, replacing the
// legacy SettingsRouter.
function SettingsLocationSync() {
    const {pathname} = useLocation();
    const {updateNavigatedSection} = useScrollSectionContext();

    useEffect(() => {
        const route = pathname.replace(/^\/settings\/?/, '');
        updateNavigatedSection(route.split('/')[0]);
    }, [pathname, updateNavigatedSection]);

    return null;
}

export function App({upgradeStatus}: AppProps) {
    return (
        <SettingsAppProvider upgradeStatus={upgradeStatus}>
            <div className='admin-x-base admin-x-settings [--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]'>
                <ConfirmationProvider>
                    <DialogPortalProvider>
                        <SettingsLocationSync />
                        <MainContent />
                        <Outlet />
                    </DialogPortalProvider>
                </ConfirmationProvider>
            </div>
        </SettingsAppProvider>
    );
}
