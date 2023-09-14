import ExitSettingsButton from './components/ExitSettingsButton';
import Heading from './admin-x-ds/global/Heading';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Users from './components/settings/general/Users';
import useRouting from './hooks/useRouting';
import {ReactNode, useEffect} from 'react';
import {canAccessSettings, isEditorUser} from './api/users';
import {useGlobalData} from './components/providers/GlobalDataProvider';

const Page: React.FC<{children: ReactNode}> = ({children}) => {
    return <>
        <div className='relative z-20 px-6 py-4 tablet:fixed'>
            <ExitSettingsButton />
        </div>

        <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] tablet:flex-row tablet:items-start tablet:gap-x-10 tablet:py-[8vmin]" id="admin-x-settings-content">
            {children}
        </div>
    </>;
};

const MainContent: React.FC = () => {
    const {currentUser} = useGlobalData();
    const {route, updateRoute} = useRouting();

    useEffect(() => {
        if (!canAccessSettings(currentUser) && route !== `users/show/${currentUser.slug}`) {
            updateRoute(`users/show/${currentUser.slug}`);
        }
    }, [currentUser, route, updateRoute]);

    if (!canAccessSettings(currentUser)) {
        return null;
    }

    if (isEditorUser(currentUser)) {
        return (
            <Page>
                <div className='w-full'>
                    <Heading className='mb-10'>Settings</Heading>
                    <Users keywords={[]} />
                </div>
            </Page>
        );
    }

    return (
        <Page>
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
        </Page>
    );
};

export default MainContent;
