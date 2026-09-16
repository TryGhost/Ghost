import { createContext, useContext } from 'react';

interface ActivityPubHostLayout {
  contentClassName?: string;
  contentGutter?: string;
}

// The embedding shell supplies layout dimensions without coupling Network to Admin.
// Standalone Network has no host and keeps its existing layout.
const ActivityPubHostLayoutContext = createContext<ActivityPubHostLayout | undefined>(undefined);

export const ActivityPubHostLayoutProvider = ActivityPubHostLayoutContext.Provider;
export const useActivityPubHostLayout = () => useContext(ActivityPubHostLayoutContext);
