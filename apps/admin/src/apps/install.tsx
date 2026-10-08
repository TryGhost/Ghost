import React from 'react';
import { AppsFlagGate } from './components/apps-flag-gate';
import { AppsListing } from './apps';
import { AskAdminDialog } from './components/ask-admin-dialog';
import { InstallDialog } from './components/install-dialog/install-dialog';
import { canManageApps } from './permissions';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';

/**
 * The install link, `#/apps/install?manifest=<url>`. Every staff user can open it, so a
 * link sent to someone who can't install apps tells them who can.
 */
const AppInstall: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) {
    return null;
  }

  if (!canManageApps(currentUser)) {
    return (
      <AppsFlagGate>
        <AskAdminDialog onClose={() => navigate('/', { replace: true })} />
      </AppsFlagGate>
    );
  }

  return (
    <AppsFlagGate>
      <AppsListing />
      <InstallDialog manifestUrl={searchParams.get('manifest')} />
    </AppsFlagGate>
  );
};

export default AppInstall;
