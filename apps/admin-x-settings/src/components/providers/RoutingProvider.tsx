import AddNewsletterModal from '../settings/email/newsletters/AddNewsletterModal';
import ChangeThemeModal from '../settings/site/ThemeModal';
import DesignModal from '../settings/site/DesignModal';
import InviteUserModal from '../settings/general/InviteUserModal';
import NavigationModal from '../settings/site/NavigationModal';
import NiceModal from '@ebay/nice-modal-react';
import PortalModal from '../settings/membership/portal/PortalModal';
import React, {createContext, useCallback, useEffect, useRef, useState} from 'react';
import StripeConnectModal from '../settings/membership/stripe/StripeConnectModal';
import TierDetailModal from '../settings/membership/tiers/TierDetailModal';

export type RouteParams = {[key: string]: string}

export type RoutingContextData = {
    route: string;
    scrolledRoute: string;
    yScroll: number;
    updateRoute: (newPath: string, params?: RouteParams) => void;
    updateScrolled: (newPath: string) => void;
    addRouteChangeListener: (listener: RouteChangeListener) => (() => void);
};

export const RouteContext = createContext<RoutingContextData>({
    route: '',
    scrolledRoute: '',
    yScroll: 0,
    updateRoute: () => {},
    updateScrolled: () => {},
    addRouteChangeListener: () => (() => {})
});

// These routes need to be handled by a SettingGroup (or other component) with the
// useHandleRoute hook. The idea is that those components will open a modal after
// loading any data required for the route
export const modalRoutes = {
    showUser: 'users/show/:slug',
    showNewsletter: 'newsletters/show/:id',
    showTier: 'tiers/show/:id'
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
        if (pathName === 'design/edit/themes') {
            NiceModal.show(ChangeThemeModal);
        } else if (pathName === 'design/edit') {
            NiceModal.show(DesignModal);
        } else if (pathName === 'navigation/edit') {
            NiceModal.show(NavigationModal);
        } else if (pathName === 'users/invite') {
            NiceModal.show(InviteUserModal);
        } else if (pathName === 'portal/edit') {
            NiceModal.show(PortalModal);
        } else if (pathName === 'tiers/add') {
            NiceModal.show(TierDetailModal);
        } else if (pathName === 'stripe-connect') {
            NiceModal.show(StripeConnectModal);
        } else if (pathName === 'newsletters/add') {
            NiceModal.show(AddNewsletterModal);
        }

        if (scroll) {
            scrollToSectionGroup(pathName);
        }

        return pathName;
    }
    return '';
};

const matchRoute = (pathname: string, routeDefinition: string) => {
    const regex = new RegExp(routeDefinition.replace(/:(\w+)/, '(?<$1>[^/]+)'));

    return pathname.match(regex)?.groups;
};

const callRouteChangeListeners = (newPath: string, listeners: RouteChangeListener[]) => {
    listeners.forEach((listener) => {
        const params = matchRoute(newPath, listener.route);

        if (params) {
            listener.callback(params);
        }
    });
};

type RouteProviderProps = {
    children: React.ReactNode;
};

type RouteChangeListener = {
    route: string;
    callback: (params: RouteParams) => void;
}

const RoutingProvider: React.FC<RouteProviderProps> = ({children}) => {
    const [route, setRoute] = useState<string>('');
    const [yScroll, setYScroll] = useState(0);
    const [scrolledRoute, setScrolledRoute] = useState<string>('');
    const routeChangeListeners = useRef<RouteChangeListener[]>([]);

    const updateRoute = useCallback((newPath: string, params?: RouteParams) => {
        if (params) {
            newPath = Object.entries(params).reduce(
                (path, [name, value]) => path.replace(`:${name}`, value),
                newPath
            );
        }

        if (newPath) {
            if (newPath === route) {
                scrollToSectionGroup(newPath);
            } else {
                window.location.hash = `/settings-x/${newPath}`;
            }
        } else {
            window.location.hash = `/settings-x`;
        }
    }, [route]);

    const updateScrolled = useCallback((newPath: string) => {
        setScrolledRoute(newPath);
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const matchedRoute = handleNavigation();
            setRoute(matchedRoute);
            callRouteChangeListeners(matchedRoute, routeChangeListeners.current);
        };

        const handleScroll = () => {
            const element = document.getElementById('admin-x-root');
            const scrollPosition = element!.scrollTop;
            setYScroll(scrollPosition);
        };

        const element = document.getElementById('admin-x-root');
        const matchedRoute = handleNavigation();
        setRoute(matchedRoute);
        callRouteChangeListeners(matchedRoute, routeChangeListeners.current);
        element!.addEventListener('scroll', handleScroll);

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            element!.removeEventListener('scroll', handleScroll);
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const addRouteChangeListener = useCallback((listener: RouteChangeListener) => {
        if (route && !routeChangeListeners.current.some(current => current.route === listener.route)) {
            callRouteChangeListeners(route, [listener]);
        }

        routeChangeListeners.current = [...routeChangeListeners.current, listener];

        return () => routeChangeListeners.current = routeChangeListeners.current.filter(current => current !== listener);
    }, [route]);

    return (
        <RouteContext.Provider
            value={{
                route,
                scrolledRoute,
                yScroll,
                updateRoute,
                updateScrolled,
                addRouteChangeListener
            }}
        >
            {children}
        </RouteContext.Provider>
    );
};

export default RoutingProvider;
