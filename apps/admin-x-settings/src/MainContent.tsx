import ExitSettingsButton from './components/ExitSettingsButton';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Users from './components/settings/general/Users';
import {Heading, confirmIfDirty, topLevelBackdropClasses, useGlobalDirtyState} from '@tryghost/admin-x-design-system';
import {ReactNode, useEffect} from 'react';
import {canAccessSettings, isEditorUser} from '@tryghost/admin-x-framework/api/users';
import {toast} from 'react-hot-toast';
import {useGlobalData} from './components/providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Page: React.FC<{children: ReactNode}> = ({children}) => {
    return <>
        <div className='fixed right-0 top-2 z-50 flex justify-end p-8 dark:bg-grey-975 tablet:fixed tablet:top-0 tablet:bg-transparent tablet:px-8 dark:tablet:bg-transparent' id="done-button-container">
            <ExitSettingsButton />
        </div>
        <div className="w-full dark:bg-grey-975 tablet:fixed tablet:left-0 tablet:top-0 tablet:flex tablet:h-full" id="admin-x-settings-content">
            {children}
        </div>
    </>;
};

const MainContent: React.FC = () => {
    const {currentUser} = useGlobalData();
    const {route, updateRoute, loadingModal} = useRouting();
    const {isDirty} = useGlobalDirtyState();

    const navigateAway = () => {
        window.location.hash = '/dashboard';
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                confirmIfDirty(isDirty, navigateAway);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        // resets any toasts that may have been left open on initial load
        toast.remove();
    }, []);

    useEffect(() => {
        if (!canAccessSettings(currentUser) && route !== `staff/${currentUser.slug}`) {
            updateRoute(`staff/${currentUser.slug}`);
        }
    }, [currentUser, route, updateRoute]);

    if (!canAccessSettings(currentUser)) {
        return null;
    }

    if (isEditorUser(currentUser)) {
        return (
            <Page>
                <div className='mx-auto w-full max-w-5xl overflow-y-auto px-[5vmin] tablet:mt-16 xl:mt-10' id="admin-x-settings-scroller">
                    <Heading className='mb-[5vmin]'>Settings</Heading>
                    <Users highlight={false} keywords={[]} />
                </div>
            </Page>
        );
    }

    return (
        <Page>
            {loadingModal && <div className={`fixed inset-0 z-40 h-[calc(100vh-55px)] w-[100vw] tablet:h-[100vh] ${topLevelBackdropClasses}`} />}
            <div className="no-scrollbar fixed inset-x-0 top-0 z-[35] flex-1 basis-[320px] bg-white p-8 dark:bg-grey-975 tablet:relative tablet:inset-x-auto tablet:top-auto tablet:h-full tablet:overflow-y-scroll tablet:bg-grey-50 tablet:py-0 dark:tablet:bg-black" id="admin-x-settings-sidebar-scroller">
                <div className="relative w-full">
                    <Sidebar />
                </div>
            </div>
            <div className="relative h-full flex-1 overflow-y-scroll bg-white pt-11 dark:bg-black tablet:basis-[800px]" id="admin-x-settings-scroller">
                <Settings />
            </div>
        </Page>
    );
};

export default MainContent;
