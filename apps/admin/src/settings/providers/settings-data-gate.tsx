import SpinningOrb from '@/settings/assets/videos/logo-loader.mp4';
import SpinningOrbDark from '@/settings/assets/videos/logo-loader-dark.mp4';
import { useBrowseConfigQueryOptions } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUserQueryOptions } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseSettingsQueryOptions } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSiteQueryOptions } from '@tryghost/admin-x-framework/api/site';
import { useSuspenseQueries } from '@tanstack/react-query';
import { type ReactNode, Suspense, useEffect, useState } from 'react';

const SettingsLoadingIndicator = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode on mount
  useEffect(() => {
    // Check if document has dark class (set by Ghost admin)
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

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
};

const SettingsDataLoader = ({ children }: { children: ReactNode }) => {
  const configQuery = useBrowseConfigQueryOptions();
  const currentUserQuery = useCurrentUserQueryOptions();
  const settingsQuery = useBrowseSettingsQueryOptions();
  const siteQuery = useBrowseSiteQueryOptions();

  const results = useSuspenseQueries({
    queries: [configQuery, currentUserQuery, settingsQuery, siteQuery],
  });
  const settledError = results.find((result) => result.error && !result.isFetching)?.error;

  if (settledError) {
    throw settledError;
  }

  return children;
};

// Start every unconditional settings dependency together. Screens below use
// suspense observers over the same canonical query options, so they read the
// warmed cache without a settings-only data context.
const SettingsDataGate = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<SettingsLoadingIndicator />}>
    <SettingsDataLoader>{children}</SettingsDataLoader>
  </Suspense>
);

export default SettingsDataGate;
