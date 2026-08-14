import ExitSettingsButton from './components/exit-settings-button';
import Settings from './components/settings';
import Sidebar from './components/sidebar';
import Users from './components/settings/general/users';
import {DirtyConfirmDialog, topLevelBackdropClasses, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {type ReactNode, useEffect} from 'react';
import {Text} from '@tryghost/shade/primitives';
import {canAccessSettings, isEditorUser} from '@tryghost/admin-x-framework/api/users';
import {toast} from 'sonner';
import {useGlobalData} from './components/providers/global-data-provider';
import {useGlobalDirtyState} from '@tryghost/shade/utils';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const EMPTY_KEYWORDS: string[] = [];
const OPEN_SHADE_MODAL_SELECTOR = ':is([role="dialog"], [role="alertdialog"])[data-state="open"]';

const Page: React.FC<{children: ReactNode}> = ({children}) => {
    return <>
        <div className='fixed top-2 right-0 z-50 m-8 flex justify-end bg-transparent tablet:fixed tablet:top-0' id="done-button-container">
            <ExitSettingsButton />
        </div>
        <div className="fixed top-0 left-0 flex size-full bg-grey-50 dark:bg-grey-950 dark:tablet:bg-[#101114]" id="admin-x-settings-content">
            {children}
        </div>
    </>;
};

const MainContent: React.FC = () => {
    const {currentUser} = useGlobalData();
    const {loadingModal} = useRouting();
    const {isDirty} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();

    const navigateAway = (escLocation: string) => {
        window.location.hash = escLocation;
    };
    const hasOpenModal = () => {
        // Legacy admin-x-design-system modals render a dedicated backdrop element.
        if (document.getElementById('modal-backdrop')) {
            return true;
        }

        // Newer Shade/Radix dialogs expose their open state via dialog roles.
        return Boolean(document.querySelector(OPEN_SHADE_MODAL_SELECTOR));
    };

    useEffect(() => {
        // Reset any toasts that may have been left open before entering Settings.
        toast.dismiss();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Don't navigate away if a modal is open - let the modal handle ESC
                if (hasOpenModal()) {
                    return;
                }

                confirm(isDirty, () => {
                    navigateAway('/');
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [confirm, isDirty]);

    // Contributors/Authors only see their profile modal (rendered via routing)
    // Don't render the main settings content for them
    if (!canAccessSettings(currentUser)) {
        return null;
    }

    if (isEditorUser(currentUser)) {
        return (
            <Page>
                <div className='flex-1 bg-white dark:bg-grey-950'>
                    <div className='h-full overflow-y-auto overscroll-y-contain' id="admin-x-settings-scroller">
                        <div className='mx-auto max-w-5xl px-[5vmin] tablet:mt-16 xl:mt-10'>
                            <Text as='h1' className='mb-[5vmin] text-4xl' leading='supertight' weight='bold'>Settings</Text>
                            <Users highlight={false} keywords={EMPTY_KEYWORDS} />
                        </div>
                    </div>
                </div>
                <DirtyConfirmDialog {...dialogProps} />
            </Page>
        );
    }

    return (
        <Page>
            {loadingModal && <div className={`fixed inset-0 z-40 h-[calc(100vh-55px)] w-[100vw] tablet:h-[100vh] ${topLevelBackdropClasses}`} />}
            <div className="fixed inset-x-0 top-0 z-[35] max-w-[calc(100%-16px)] flex-1 basis-[320px] overscroll-y-contain bg-white p-8 tablet:relative tablet:inset-x-auto tablet:top-auto tablet:h-full tablet:overflow-y-scroll tablet:bg-grey-50 tablet:py-0 dark:bg-grey-950 dark:tablet:bg-[#101114]" id="admin-x-settings-sidebar-scroller">
                <div className="relative w-full">
                    <Sidebar />
                </div>
            </div>
            <div className="h-full flex-1 bg-white tablet:basis-[800px] dark:bg-grey-950 dark:tablet:bg-black">
                <div className="relative h-full overflow-y-scroll overscroll-y-contain pt-13" id="admin-x-settings-scroller">
                    <Settings />
                </div>
            </div>
            <DirtyConfirmDialog {...dialogProps} />
        </Page>
    );
};

export default MainContent;
