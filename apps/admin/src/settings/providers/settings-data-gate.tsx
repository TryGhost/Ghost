import SpinningOrb from '@/settings/assets/videos/logo-loader.mp4';
import SpinningOrbDark from '@/settings/assets/videos/logo-loader-dark.mp4';
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

// Suspense boundary for the settings tree: screens below read data with the
// useSuspenseQuery-backed hooks in settings/hooks/use-settings-data.ts, so
// loading suspends into the orb here and query errors throw to the route's
// error boundary.
const SettingsDataGate = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<SettingsLoadingIndicator />}>{children}</Suspense>
);

export default SettingsDataGate;
