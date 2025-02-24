import {matchRoutes, useLocation} from '@tryghost/admin-x-framework';
import {routes} from '@src/routes';

const useActiveRoute = () => {
    const location = useLocation();
    const matched = matchRoutes(routes, location.pathname);

    return matched ? matched[0].route : null;
};

export default useActiveRoute;
