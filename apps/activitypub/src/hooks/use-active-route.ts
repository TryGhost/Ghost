import {CustomRouteObject, routes} from '@src/routes';
import {matchRoutes, useLocation} from '@tryghost/admin-x-framework';

const useActiveRoute = () => {
    const location = useLocation();
    const matched = matchRoutes(routes, location.pathname);

    if (!matched) {
        return null;
    }

    const routesWithTitles = matched
        .map(match => match.route as CustomRouteObject)
        .filter(route => route.pageTitle);

    return routesWithTitles[routesWithTitles.length - 1] || matched[matched.length - 1].route as CustomRouteObject;
};

export default useActiveRoute;
