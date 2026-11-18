import SpinningOrb from '@/settings/assets/videos/logo-loader.mp4';
import SpinningOrbDark from '@/settings/assets/videos/logo-loader-dark.mp4';
import { GlobalDataContext } from './global-data-context';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { type ReactNode } from 'react';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';

// The videos' flat backgrounds never exactly match the page; fading the corners
// hides the square while keeping the orb, which reaches ~98% of the frame's radius.
const orbMask = 'radial-gradient(circle closest-side, black 98%, transparent 100%)';
const orbStyle = { width: '100px', height: '100px', maskImage: orbMask, WebkitMaskImage: orbMask };

const GlobalDataProvider = ({ children }: { children: ReactNode }) => {
  const settings = useBrowseSettings();
  const site = useBrowseSite();
  const config = useBrowseConfig();
  const currentUser = useCurrentUser();
  const requests = [settings, site, config, currentUser];

  const error = requests.map((request) => request.error).find(Boolean);

  if (error) {
    throw error;
  }

  if (requests.some((request) => request.isLoading)) {
    return (
      <div
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
          aria-hidden="true"
          autoPlay={true}
          className="dark:hidden"
          height="100"
          preload="metadata"
          style={orbStyle}
          tabIndex={-1}
          width="100"
          loop
          muted
          playsInline
        >
          <source src={SpinningOrb} type="video/mp4" />
        </video>
        <video
          aria-hidden="true"
          autoPlay={true}
          className="hidden dark:block"
          height="100"
          preload="metadata"
          style={orbStyle}
          tabIndex={-1}
          width="100"
          loop
          muted
          playsInline
        >
          <source src={SpinningOrbDark} type="video/mp4" />
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
