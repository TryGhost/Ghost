import Header from './Header';
import NewNoteModal from '@components/modals/NewNoteModal';
import Onboarding, {useOnboardingStatus} from './Onboarding';
import React, {useRef, useState} from 'react';
import Sidebar from './Sidebar';
import {Navigate, ScrollRestoration} from '@tryghost/admin-x-framework';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useKeyboardShortcuts} from '@hooks/use-keyboard-shortcuts';

const Layout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    const {isOnboarded} = useOnboardingStatus();
    const {data: currentUser, isLoading} = useCurrentUser();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const {isNewNoteModalOpen, setIsNewNoteModalOpen} = useKeyboardShortcuts();

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    const closeMobileSidebar = () => {
        setIsMobileSidebarOpen(false);
    };

    if (isLoading || !currentUser) {
        return null;
    }

    if (!isOnboarded) {
        return <Navigate to={`/welcome`} replace />;
    }

    return (
        <div ref={containerRef} className={`h-screen w-full ${isOnboarded && 'overflow-y-auto'}`} data-scrollable-container>
            <ScrollRestoration containerRef={containerRef} />
            <div className='relative mx-auto flex max-w-page flex-col' {...props}>
                {isOnboarded ?
                    <>
                        <div className='block grid-cols-[auto_320px] items-start lg:grid'>
                            <div className='z-0'>
                                <Header
                                    onToggleMobileSidebar={toggleMobileSidebar}
                                />
                                <div className='px-[min(4vw,32px)]'>
                                    {children}
                                </div>
                            </div>
                            <Sidebar
                                isMobileSidebarOpen={isMobileSidebarOpen}
                                onCloseMobileSidebar={closeMobileSidebar}
                            />
                        </div>
                        {/* Mobile sidebar backdrop */}
                        {isMobileSidebarOpen && (
                            <div
                                className="fixed inset-0 z-40 lg:hidden"
                                onClick={closeMobileSidebar}
                            />
                        )}
                    </> :
                    <Onboarding />
                }
            </div>

            <NewNoteModal
                open={isNewNoteModalOpen}
                onOpenChange={setIsNewNoteModalOpen}
            />
        </div>
    );
};

export default Layout;
