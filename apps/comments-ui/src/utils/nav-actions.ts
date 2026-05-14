import {createContext, useContext} from 'react';

export type NavActions = {
    requestFocusedThreadView: (commentId: string) => void;
    requestInstantScroll: (commentId: string) => void;
    navigateBackToParent: (commentId: string, permalink: string) => void;
};

// No-op defaults so isolated component tests don't need to install the provider.
// Content overrides these in real use.
const noopNavActions: NavActions = {
    requestFocusedThreadView: () => {},
    requestInstantScroll: () => {},
    navigateBackToParent: () => {}
};

export const NavActionsContext = createContext<NavActions>(noopNavActions);

export function useNavActions(): NavActions {
    return useContext(NavActionsContext);
}
