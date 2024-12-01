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
    case 'activity':
        return <Activities />;
    case 'profile':
        return <Profile />;
    default:
        const layout = (mainRoute === 'inbox' || mainRoute === '') ? 'inbox' : 'feed';

        return <Inbox layout={layout} />;
    }
};

export default MainContent;
