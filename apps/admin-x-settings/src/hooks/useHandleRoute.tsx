import {RouteContext, RouteParams} from '../components/providers/RoutingProvider';
import {useContext, useEffect} from 'react';

const useHandleRoute = (route: string, callback: (params: RouteParams) => void, dependencies: unknown[]) => {
    const {addRouteChangeListener} = useContext(RouteContext);

    useEffect(() => {
        const unsubscribe = addRouteChangeListener({route, callback});

        return unsubscribe;
    }, [route, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useHandleRoute;
