import {RouteContext, RoutingContextData} from '../components/providers/RoutingProvider';
import {useContext} from 'react';

export type RoutingHook = Pick<RoutingContextData, 'route' | 'scrolledRoute' | 'yScroll' | 'updateRoute' | 'updateScrolled'>;

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
