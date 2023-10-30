import NiceModal from '@ebay/nice-modal-react';
import React, {createContext, useCallback, useEffect, useState} from 'react';
import {useScrollSectionContext} from '../../hooks/useScrollSection';
import type {ModalComponent, ModalName} from './routing/modals';

export type RouteParams = {[key: string]: string}

export type ExternalLink = {
    isExternal: true;
    route: string;
    models?: string[] | null
};

export type InternalLink = {
    isExternal?: false;
    route: string;
}

export type RoutingContextData = {
    route: string;
    updateRoute: (to: string | InternalLink | ExternalLink) => void;
    loadingModal: boolean;
};

export const RouteContext = createContext<RoutingContextData>({
    route: '',
    updateRoute: () => {},
    loadingModal: false
});

export type RoutingModalProps = {
    pathName: string;
    params?: Record<string, string>,
    searchParams?: URLSearchParams
}

const modalPaths: {[key: string]: ModalName} = {
    'design/change-theme': 'DesignAndThemeModal',
    'design/edit': 'DesignAndThemeModal',
    // this is a special route, because it can install a theme directly from the Ghost Marketplace
    'design/change-theme/install': 'DesignAndThemeModal',
    'navigation/edit': 'NavigationModal',
    'staff/invite': 'InviteUserModal',
    'staff/:slug': 'UserDetailModal',
    'portal/edit': 'PortalModal',
    'tiers/add': 'TierDetailModal',
    'tiers/:id': 'TierDetailModal',
    'stripe-connect': 'StripeConnectModal',
    'newsletters/new': 'AddNewsletterModal',
    'newsletters/:id': 'NewsletterDetailModal',
    'history/view': 'HistoryModal',
    'history/view/:user': 'HistoryModal',
    'integrations/zapier': 'ZapierModal',
    'integrations/slack': 'SlackModal',
    'integrations/amp': 'AmpModal',
    'integrations/unsplash': 'UnsplashModal',
    'integrations/firstpromoter': 'FirstpromoterModal',
    'integrations/pintura': 'PinturaModal',
    'integrations/new': 'AddIntegrationModal',
    'integrations/:id': 'CustomIntegrationModal',
    'recommendations/add': 'AddRecommendationModal',
    'recommendations/edit': 'EditRecommendationModal',
    'announcement-bar/edit': 'AnnouncementBarModal',
    'embed-signup-form/show': 'EmbedSignupFormModal',
    about: 'AboutModal'
};

function getHashPath(urlPath: string | undefined) {
    if (!urlPath) {
        return null;
    }
    const regex = /\/settings\/(.*)/;
    const match = urlPath?.match(regex);

    if (match) {
        const afterSettingsX = match[1];
        return afterSettingsX;
    }
    return null;
}

const handleNavigation = (currentRoute: string | undefined) => {
    // Get the hash from the URL
    let hash = window.location.hash;
    hash = hash.substring(1);

    // Create a URL to easily extract the path without query parameters
    const domain = `${window.location.protocol}//${window.location.hostname}`;
    let url = new URL(hash, domain);

    const pathName = getHashPath(url.pathname);
    const searchParams = url.searchParams;

    if (pathName) {
        const [, currentModalName] = Object.entries(modalPaths).find(([modalPath]) => matchRoute(currentRoute || '', modalPath)) || [];
        const [path, modalName] = Object.entries(modalPaths).find(([modalPath]) => matchRoute(pathName, modalPath)) || [];

        return {
            pathName,
            changingModal: modalName && modalName !== currentModalName,
            modal: (path && modalName) ? // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
                import('./routing/modals').then(({default: modals}) => {
                    NiceModal.show(modals[modalName] as ModalComponent, {pathName, params: matchRoute(pathName, path), searchParams});
                }) :
                undefined
        };
    }
    return {pathName: ''};
};

const matchRoute = (pathname: string, routeDefinition: string) => {
    const regex = new RegExp('^' + routeDefinition.replace(/:(\w+)/, '(?<$1>[^/]+)') + '$');
    const match = pathname.match(regex);
    if (match) {
        return match.groups || {};
    }
};

type RouteProviderProps = {
    externalNavigate: (link: ExternalLink) => void;
    children: React.ReactNode;
};

const RoutingProvider: React.FC<RouteProviderProps> = ({externalNavigate, children}) => {
    const [route, setRoute] = useState<string | undefined>(undefined);
    const [loadingModal, setLoadingModal] = useState(false);
    const {updateNavigatedSection, scrollToSection} = useScrollSectionContext();

    useEffect(() => {
        // Preload all the modals after initial render to avoid a delay when opening them
        setTimeout(() => {
            import('./routing/modals');
        }, 1000);
    }, []);

    const updateRoute = useCallback((to: string | InternalLink | ExternalLink) => {
        const options = typeof to === 'string' ? {route: to} : to;

        if (options.isExternal) {
            externalNavigate(options);
            return;
        }

        const newPath = options.route;

        if (newPath === route) {
            scrollToSection(newPath.split('/')[0]);
        } else if (newPath) {
            window.location.hash = `/settings/${newPath}`;
        } else {
            window.location.hash = `/settings`;
        }
    }, [externalNavigate, route, scrollToSection]);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute((currentRoute) => {
                const {pathName, modal, changingModal} = handleNavigation(currentRoute);

                if (modal && changingModal) {
                    setLoadingModal(true);
                    modal.then(() => setLoadingModal(false));
                }

                return pathName;
            });
        };

        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (route !== undefined) {
            updateNavigatedSection(route.split('/')[0]);
        }
    }, [route, updateNavigatedSection]);

    if (route === undefined) {
        return null;
    }

    return (
        <RouteContext.Provider
            value={{
                route,
                updateRoute,
                loadingModal
            }}
        >
            {children}
        </RouteContext.Provider>
    );
};

export default RoutingProvider;
