import NiceModal, {NiceModalHocProps} from '@ebay/nice-modal-react';

import React, {createContext, useCallback, useEffect, useState} from 'react';

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
    scrolledRoute: string;
    yScroll: number;
    updateRoute: (to: string | InternalLink | ExternalLink) => void;
    updateScrolled: (newPath: string) => void;
};

export const RouteContext = createContext<RoutingContextData>({
    route: '',
    scrolledRoute: '',
    yScroll: 0,
    updateRoute: () => {},
    updateScrolled: () => {}
});

export type RoutingModalProps = {
    params?: Record<string, string>
}

const AddIntegrationModal = () => import('../settings/advanced/integrations/AddIntegrationModal');
const AddNewsletterModal = () => import('../settings/email/newsletters/AddNewsletterModal');
const AddRecommendationModal = () => import('../settings/site/recommendations/AddRecommendationModal');
const AmpModal = () => import('../settings/advanced/integrations/AmpModal');
const ChangeThemeModal = () => import('../settings/site/ThemeModal');
const CustomIntegrationModal = () => import('../settings/advanced/integrations/CustomIntegrationModal');
const DesignModal = () => import('../settings/site/DesignModal');
const EditRecommendationModal = () => import('../settings/site/recommendations/EditRecommendationModal');
const FirstpromoterModal = () => import('../settings/advanced/integrations/FirstPromoterModal');
const HistoryModal = () => import('../settings/advanced/HistoryModal');
const InviteUserModal = () => import('../settings/general/InviteUserModal');
const NavigationModal = () => import('../settings/site/NavigationModal');
const NewsletterDetailModal = () => import('../settings/email/newsletters/NewsletterDetailModal');
const PinturaModal = () => import('../settings/advanced/integrations/PinturaModal');
const PortalModal = () => import('../settings/membership/portal/PortalModal');
const SlackModal = () => import('../settings/advanced/integrations/SlackModal');
const StripeConnectModal = () => import('../settings/membership/stripe/StripeConnectModal');
const TierDetailModal = () => import('../settings/membership/tiers/TierDetailModal');
const UnsplashModal = () => import('../settings/advanced/integrations/UnsplashModal');
const UserDetailModal = () => import('../settings/general/UserDetailModal');
const ZapierModal = () => import('../settings/advanced/integrations/ZapierModal');
const AnnouncementBarModal = () => import('../settings/site/AnnouncementBarModal');
const EmbedSignupFormModal = () => import('../settings/membership/embedSignup/EmbedSignupFormModal');

const modalPaths: {[key: string]: () => Promise<{default: React.FC<NiceModalHocProps & RoutingModalProps>}>} = {
    'design/edit/themes': ChangeThemeModal,
    'design/edit': DesignModal,
    'navigation/edit': NavigationModal,
    'users/invite': InviteUserModal,
    'users/show/:slug': UserDetailModal,
    'portal/edit': PortalModal,
    'tiers/add': TierDetailModal,
    'tiers/show/:id': TierDetailModal,
    'stripe-connect': StripeConnectModal,
    'newsletters/add': AddNewsletterModal,
    'newsletters/show/:id': NewsletterDetailModal,
    'history/view': HistoryModal,
    'integrations/zapier': ZapierModal,
    'integrations/slack': SlackModal,
    'integrations/amp': AmpModal,
    'integrations/unsplash': UnsplashModal,
    'integrations/firstpromoter': FirstpromoterModal,
    'integrations/pintura': PinturaModal,
    'integrations/add': AddIntegrationModal,
    'integrations/show/:id': CustomIntegrationModal,
    'recommendations/add': AddRecommendationModal,
    'recommendations/:id': EditRecommendationModal,
    'announcement-bar/edit': AnnouncementBarModal,
    'embed-signup-form/show': EmbedSignupFormModal
};

function getHashPath(urlPath: string | undefined) {
    if (!urlPath) {
        return null;
    }
    const regex = /\/settings-x\/(.*)/;
    const match = urlPath?.match(regex);

    if (match) {
        const afterSettingsX = match[1];
        return afterSettingsX;
    }
    return null;
}

const scrollToSectionGroup = (pathName: string) => {
    const element = document.getElementById(pathName);
    if (element) {
        element.scrollIntoView({behavior: 'smooth'});
    }
};

const handleNavigation = (scroll: boolean = true) => {
    // Get the hash from the URL
    let hash = window.location.hash;

    // Remove the leading '#' character from the hash
    hash = hash.substring(1);

    // Get the path name from the hash
    const pathName = getHashPath(hash);

    if (pathName) {
        const [path, modal] = Object.entries(modalPaths).find(([modalPath]) => matchRoute(pathName, modalPath)) || [];

        if (path && modal) {
            modal().then(({default: component}) => NiceModal.show(component, {params: matchRoute(pathName, path)}));
        }

        if (scroll) {
            scrollToSectionGroup(pathName);
        }

        return pathName;
    }
    return '';
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
    const [route, setRoute] = useState<string>('');
    const [yScroll, setYScroll] = useState(0);
    const [scrolledRoute, setScrolledRoute] = useState<string>('');

    useEffect(() => {
        // Preload all the modals after initial render to avoid a delay when opening them
        setTimeout(() => {
            Object.values(modalPaths).forEach(modal => modal());
        }, 1000);
    }, []);

    const updateRoute = useCallback((to: string | InternalLink | ExternalLink) => {
        const options = typeof to === 'string' ? {route: to} : to;

        if (options.isExternal) {
            externalNavigate(options);
            return;
        }

        const newPath = options.route;

        if (newPath) {
            if (newPath === route) {
                scrollToSectionGroup(newPath);
            } else {
                window.location.hash = `/settings-x/${newPath}`;
            }
        } else {
            window.location.hash = `/settings-x`;
        }
    }, [externalNavigate, route]);

    const updateScrolled = useCallback((newPath: string) => {
        setScrolledRoute(newPath);
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const matchedRoute = handleNavigation();
            setRoute(matchedRoute);
        };

        const handleScroll = () => {
            const element = document.getElementById('admin-x-root');
            const scrollPosition = element!.scrollTop;
            setYScroll(scrollPosition);
        };

        const element = document.getElementById('admin-x-root');
        const matchedRoute = handleNavigation();
        setRoute(matchedRoute);
        element!.addEventListener('scroll', handleScroll);

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            element!.removeEventListener('scroll', handleScroll);
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <RouteContext.Provider
            value={{
                route,
                scrolledRoute,
                yScroll,
                updateRoute,
                updateScrolled
            }}
        >
            {children}
        </RouteContext.Provider>
    );
};

export default RoutingProvider;
