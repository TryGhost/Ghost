import Heading from './admin-x-ds/global/Heading';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Users from './components/settings/general/Users';
import useRouting from './hooks/useRouting';
import {canAccessSettings, isEditorUser} from './api/users';
import {useEffect} from 'react';
import {useGlobalData} from './components/providers/GlobalDataProvider';

const MainContent = () => {
    const {currentUser} = useGlobalData();
    const {route, updateRoute} = useRouting();

    useEffect(() => {
        if (!route.startsWith('users/show/') && !canAccessSettings(currentUser)) {
            updateRoute(`users/show/${currentUser.slug}`);
        }
    }, [currentUser, route, updateRoute]);

    if (isEditorUser(currentUser)) {
        return (
            <div className='w-full'>
                <Heading className='mb-10'>Settings</Heading>
                <Users keywords={[]} />
            </div>
        );
    }

    return (
        <>
            {/* Sidebar */}
            <div className="sticky top-[-42px] z-20 min-w-[260px] grow-0 md:top-[-52px] tablet:fixed tablet:top-[8vmin] tablet:basis-[260px]">
                <div className='-mx-6 h-[84px] bg-white px-6 tablet:m-0 tablet:bg-transparent tablet:p-0'>
                    <Heading>Settings</Heading>
                </div>
                <div className="relative mt-[-32px] w-full overflow-x-hidden after:absolute after:inset-x-0 after:top-0 after:hidden after:h-[40px] after:bg-gradient-to-b after:from-white after:to-transparent after:content-[''] dark:after:from-black tablet:w-[260px] tablet:after:!visible tablet:after:!block">
                    <Sidebar />
                </div>
            </div>
            <div className="relative flex-auto pt-[3vmin] tablet:ml-[300px] tablet:pt-[85px]">
                {/* <div className='pointer-events-none fixed inset-x-0 top-0 z-[5] hidden h-[80px] bg-gradient-to-t from-transparent to-white to-60% dark:to-black tablet:!visible tablet:!block'></div> */}
                <Settings />
            </div>
        </>
    );
};

export default MainContent;
