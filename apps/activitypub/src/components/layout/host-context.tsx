import { type ReactNode, createContext, useContext } from 'react';

interface ActivityPubHostLayout {
  headerLeading?: ReactNode;
  contentClassName?: string;
  contentGutter?: string;
}

// The embedding shell supplies its controls without coupling Network to Admin.
// Standalone Network has no host and keeps its existing layout.
const ActivityPubHostLayoutContext = createContext<ActivityPubHostLayout | undefined>(undefined);

export const ActivityPubHostLayoutProvider = ActivityPubHostLayoutContext.Provider;
export const useActivityPubHostLayout = () => useContext(ActivityPubHostLayoutContext);
