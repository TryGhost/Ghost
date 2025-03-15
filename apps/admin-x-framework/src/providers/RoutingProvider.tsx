import NiceModal, {NiceModalHocProps} from '@ebay/nice-modal-react';
import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {useFramework} from './FrameworkProvider';

/**
 * OBSOLETE DO NOT USE FOR NEW REACT APPS IN GHOST!
 *
 * This is a home-grown routing provider which is only used in Settings and to
 * be removed from there as well. For new apps use the React Router based
 * RouterProvider component.
 */

export type RouteParams = Record<string, string>

export type ExternalLink = {
    isExternal: true;
    route: string;
    models?: string[] | null
};

export type InternalLink = {
    isExternal?: false;
    route: string;
}

export type RoutingModalProps = {
    pathName: string;
    params?: Record<string, string>,
    searchParams?: URLSearchParams
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalsModule = {default: {[key: string]: ModalComponent<any>}}

export type ModalComponent<Props = object> = React.FC<NiceModalHocProps & RoutingModalProps & Props>;

export type RoutingContextData = {
    route: string;
    updateRoute: (to: string | InternalLink | ExternalLink) => void;
    loadingModal: boolean;
    eventTarget: EventTarget;
};

export const RouteContext = createContext<RoutingContextData>({
    route: '',
    updateRoute: () => {},
    loadingModal: false,
    eventTarget: new EventTarget()
});

function getHashPath(basePath: string, urlPath: string | undefined) {
    if (!urlPath) {
        return null;
    }
    const regex = new RegExp(`/${basePath}/(.*)`);
    const match = urlPath?.match(regex);
    if (match) {
        const afterSettingsX = match[1];
        return afterSettingsX;
    }
    return null;
}

const handleNavigation = (basePath: string, currentRoute: string | undefined, loadModals?: () => Promise<ModalsModule>, modalPaths?: Record<string, string>) => {
    // Get the hash from the URL
    let hash = window.location.hash;
    hash = hash.substring(1);

    // Create a URL to easily extract the path without query parameters
    const domain = `${window.location.protocol}//${window.location.hostname}`;
    const url = new URL(hash, domain);

    const pathName = getHashPath(basePath, url.pathname);

    // Return early if we don't have modal configuration
    if (!modalPaths || !loadModals) {
        return {pathName: pathName || ''};
    }

    const searchParams = url.searchParams;

    if (pathName && modalPaths && loadModals) {
        const [, currentModalName] = Object.entries(modalPaths).find(([modalPath]) => matchRoute(currentRoute || '', modalPath)) || [];
        const [path, modalName] = Object.entries(modalPaths).find(([modalPath]) => matchRoute(pathName, modalPath)) || [];

        return {
            pathName,
            changingModal: modalName && modalName !== currentModalName,
            modal: (path && modalName) ? // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
                loadModals().then(({default: modals}) => {
                    NiceModal.show(modals[modalName] as ModalComponent, {pathName, params: matchRoute(pathName, path), searchParams});
                }) :
                undefined
        };
    }
    return {pathName: ''};
};

const matchRoute = (pathname: string, routeDefinition: string) => {
    const regex = new RegExp('^' + routeDefinition.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$');
    const match = pathname.match(regex);
    if (match) {
        return match.groups || {};
    }
};

export interface RoutingProviderProps {
    basePath: string;
    modals?: {paths: Record<string, string>, load: () => Promise<ModalsModule>}
    children: React.ReactNode;
}

export const RoutingProvider: React.FC<RoutingProviderProps> = ({basePath, modals, children}) => {
    const {externalNavigate} = useFramework();
    const [route, setRoute] = useState<string | undefined>(undefined);
    const [loadingModal, setLoadingModal] = useState(false);
    const [eventTarget] = useState(new EventTarget());

    const updateRoute = useCallback((to: string | InternalLink | ExternalLink) => {
        const options = typeof to === 'string' ? {route: to} : to;

        if (options.isExternal) {
            externalNavigate(options);
            return;
        }

        const newPath = options.route.replace(/^\//, '');

        if (newPath === route) {
            // No change
        } else if (newPath) {
            window.location.hash = `/${basePath}/${newPath}`;
        } else {
            window.location.hash = `/${basePath}`;
        }

        eventTarget.dispatchEvent(new CustomEvent('routeChange', {detail: {newPath, oldPath: route}}));
    }, [basePath, eventTarget, externalNavigate, route]);

    useEffect(() => {
        // Preload all the modals after initial render to avoid a delay when opening them
        setTimeout(() => {
            modals?.load();
        }, 1000);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleHashChange = () => {
            setRoute((currentRoute) => {
                const {pathName, modal, changingModal} = handleNavigation(basePath, currentRoute, modals?.load, modals?.paths);

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

    if (route === undefined) {
        return null;
    }

    return (
        <RouteContext.Provider
            value={{
                route,
                updateRoute,
                loadingModal,
                eventTarget
            }}
        >
            {children}
        </RouteContext.Provider>
    );
};

export function useRouting() {
    return useContext(RouteContext);
}

export function useRouteChangeCallback(callback: (newPath: string, oldPath: string) => void, deps: React.DependencyList) {
    const {eventTarget} = useRouting();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stableCallback = useCallback(callback, deps);

    useEffect(() => {
        const listener: EventListener = (e) => {
            const event = e as CustomEvent<{newPath: string, oldPath: string}>;
            stableCallback(event.detail.newPath, event.detail.oldPath);
        };

        eventTarget.addEventListener('routeChange', listener);

        return () => eventTarget.removeEventListener('routeChange', listener);
    }, [eventTarget, stableCallback]);
}
