import {RouteContext} from '../components/providers/RoutingProvider';
import {useContext} from 'react';

const useRouting = () => useContext(RouteContext);

export default useRouting;
