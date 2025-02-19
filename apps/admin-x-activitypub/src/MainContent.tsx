import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import Search from '@views/Search';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {route} = useRouting();
    const mainRoute = route.split('/')[0];
    switch (mainRoute) {
    case 'search':
        return <Search />;
    case 'notifications':
        return <Notifications />;
    case 'profile':
        return <Profile />;
    default:
        const layout = (mainRoute === 'inbox' || mainRoute === '') ? 'inbox' : 'feed';

        return <Inbox layout={layout} />;
    }
};

export default MainContent;
