import {RouteContext} from '../components/providers/RoutingProvider';
import {useContext} from 'react';

export type RoutingHook = {
    route: string;
    scrolledRoute: string;
    yScroll?: number;
    updateScrolled: (newPath: string) => void,
    updateRoute: (newPath: string) => void
};

const useRouting = (): RoutingHook => {
    const {route, scrolledRoute, yScroll, updateScrolled, updateRoute} = useContext(RouteContext);

    return {
        route,
        scrolledRoute,
        yScroll,
        updateScrolled,
        updateRoute
    };
};

export default useRouting;
