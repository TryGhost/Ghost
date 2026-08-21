import SpinningOrb from '@/settings/assets/videos/logo-loader.mp4';
import SpinningOrbDark from '@/settings/assets/videos/logo-loader-dark.mp4';
import { GlobalDataContext } from './global-data-context';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { type ReactNode, useEffect, useState } from 'react';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';

const GlobalDataProvider = ({ children }: { children: ReactNode }) => {
  const settings = useBrowseSettings();
  const site = useBrowseSite();
  const config = useBrowseConfig();
  const currentUser = useCurrentUser();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode on mount
  useEffect(() => {
    // Check if document has dark class (set by Ghost admin)
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const requests = [settings, site, config, currentUser];

  const error = requests.map((request) => request.error).find(Boolean);

  if (error) {
    throw error;
  }

  if (requests.some((request) => request.isLoading)) {
    return (
      <div
        className="gh-loading-orb-container"
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '8vh',
        }}
      >
        <video
          autoPlay={true}
          className="gh-loading-orb"
          height="100"
          preload="metadata"
          style={{
            width: '100px',
            height: '100px',
          }}
          width="100"
          loop
          muted
          playsInline
        >
          <source src={isDarkMode ? SpinningOrbDark : SpinningOrb} type="video/mp4" />
        </video>
      </div>
    );
  }

  return (
    <GlobalDataContext.Provider
      value={{
        settings: settings.data!.settings,
        siteData: site.data!.site,
        config: config.data!.config,
        currentUser: currentUser.data!,
      }}
    >
      {children}
    </GlobalDataContext.Provider>
  );
};

export default GlobalDataProvider;
