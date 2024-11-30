import Activities from './components/Activities';
import Inbox from './components/Inbox';
import Profile from './components/Profile';
import Search from './components/Search';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {route} = useRouting();
    const mainRoute = route.split('/')[0];
    switch (mainRoute) {
    case 'search':
        return <Search />;
        break;
    case 'activity':
        return <Activities />;
        break;
    case 'profile':
        return <Profile />;
        break;
    default:
        const layout = (mainRoute === 'inbox' || mainRoute === '') ? 'inbox' : 'feed';
        return <Inbox layout={layout} />;
        break;
    }
};

export default MainContent;
