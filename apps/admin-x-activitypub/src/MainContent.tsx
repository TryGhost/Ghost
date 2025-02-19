import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import Search from '@views/Search';
import Sidebar from '@components/layout/Sidebar';
import {Header} from '@components/layout/Header';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface ContentProps {
    route: string;
}

const Content: React.FC<ContentProps> = ({route}) => {
    switch (route) {
    case 'search':
        return <Search />;
    case 'notifications':
        return <Notifications />;
    case 'profile':
        return <Profile />;
    default:
        const layout = (route === 'inbox' || route === '') ? 'inbox' : 'feed';
        return <Inbox layout={layout} />;
    }
};

const MainContent = () => {
    const {route} = useRouting();
    const mainRoute = route.split('/')[0] || 'inbox';

    return (
        <div className='mx-auto flex h-screen w-full max-w-page flex-col overflow-y-auto'>
            <Header route={mainRoute} />
            <div className='grid grid-cols-[auto_292px] items-start gap-8 px-8'>
                <div className='z-0'>
                    <Content route={mainRoute} />
                </div>
                <Sidebar route={mainRoute} />
            </div>
        </div>
    );
};

export default MainContent;
