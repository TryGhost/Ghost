import React, { createContext, useContext } from 'react';

/** Resolved milestone availability. Hosts own Labs, route and capability checks. */
export interface Admin7Features {
  readonly pill: boolean;
}

// Shade previews show the intended defaults. Admin must supply resolved features.
export const ADMIN7_PREVIEW_FEATURES: Admin7Features = { pill: true };

const Admin7Context = createContext<Admin7Features>(ADMIN7_PREVIEW_FEATURES);

export const useAdmin7 = () => useContext(Admin7Context);

export function Admin7Provider({
  features,
  children,
}: {
  features: Admin7Features;
  children: React.ReactNode;
}) {
  return <Admin7Context.Provider value={features}>{children}</Admin7Context.Provider>;
}

/** Use on the app scope and every portal scope, never on document.body. */
export function getAdmin7ScopeAttributes(features: Admin7Features) {
  return { 'data-admin7-pill': features.pill } satisfies {
    [Feature in keyof Admin7Features as `data-admin7-${Feature}`]: boolean;
  };
}
