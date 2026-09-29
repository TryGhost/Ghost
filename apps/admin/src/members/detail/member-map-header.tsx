import React, { lazy, Suspense } from 'react';

// Keep map geometry out of the normal member-page bundle while Labs is off.
const MemberLocationMap = lazy(() => import('./member-location-map'));

// A map failure should never prevent reading or editing the member.
class MapErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback: React.ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function MemberMapHeader({
  enabled,
  children,
  geolocation,
}: React.PropsWithChildren<{
  enabled: boolean;
  geolocation?: string | null;
}>) {
  if (!enabled) {
    return children;
  }
  return (
    <MapErrorBoundary fallback={children}>
      <Suspense fallback={children}>
        <MemberLocationMap geolocation={geolocation}>{children}</MemberLocationMap>
      </Suspense>
    </MapErrorBoundary>
  );
}
