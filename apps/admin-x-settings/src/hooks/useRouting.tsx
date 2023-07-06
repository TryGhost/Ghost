import {RouteContext} from '../components/providers/RoutingProvider';
import {useContext} from 'react';

export type RoutingHook = {
    route: string;
    updateRoute: (newPath: string) => void
};

const useRouting = (): RoutingHook => {
    const {route, updateRoute} = useContext(RouteContext);

    return {
        route,
        updateRoute
    };
};

export default useRouting;
