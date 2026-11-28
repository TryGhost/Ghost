import React from 'react';
import { AppsGate } from './components/apps-gate';
import { AppsListing } from './apps';
import { AskAdminDialog } from './components/ask-admin-dialog';
import { InstallDialog } from './components/install-dialog/install-dialog';
import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useAppsAvailability } from './lib/use-apps-availability';

/**
 * The install link, `#/apps/install?manifest=<url>`. Every staff user can open it, so a
 * link sent to someone who can't install apps tells them who can. On a site where apps can't
 * be used there's nothing to install or approve, and the listing behind the dialog says why.
 */
const AppInstall: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const availability = useAppsAvailability();

  return (
    <AppsGate denied={<AskAdminDialog onClose={() => navigate('/', { replace: true })} />}>
      <AppsListing />
      {availability === 'supported' && <InstallDialog manifestUrl={searchParams.get('manifest')} />}
    </AppsGate>
  );
};

export default AppInstall;
