import React from 'react';
import {TabList} from '../TabView';
import clsx from 'clsx';
import PageMenu from './PageMenu';
import GlobalActions from './GlobalActions';
import Button from '../Button';

export interface PageTab {
    id: string;
    title: string;
}

export interface CustomGlobalAction {
    iconName: string;
    onClick?: () => void;
}

interface PageToolbarProps {
    mainClassName?: string;
    showPageMenu?: boolean;
    showGlobalActions?: boolean;
    customGlobalActions?: CustomGlobalAction[];
    pageTabs?: PageTab[],
    selectedTab?: string;
    onTabChange?: (id: string) => void;
    children?: React.ReactNode;
}

const PageToolbar: React.FC<PageToolbarProps> = ({
    mainClassName,
    showPageMenu = false,
    showGlobalActions = false,
    customGlobalActions,
    pageTabs,
    selectedTab,
    onTabChange,
    children
}) => {
    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    if (pageTabs?.length && !selectedTab) {
        selectedTab = pageTabs[0].id;
    }

    const left: React.ReactNode = <div className='flex items-center gap-10'>
        {showPageMenu && (
            <PageMenu />
        )}
        {pageTabs?.length && (
            <TabList
                border={false}
                buttonBorder={false}
                handleTabChange={handleTabChange}
                selectedTab={selectedTab}
                tabs={pageTabs!}
                width='normal'
            />
        )}

    </div>;

    mainClassName = clsx(
        'absolute inset-0 flex h-[100vh] w-[100vw] flex-col',
        mainClassName
    );

    const globalActions = (
        <div className='sticky flex items-center gap-7'>
            {(customGlobalActions?.map((action) => {
                return (
                    <Button icon={action.iconName} iconColorClass='text-black' size='sm' link onClick={action.onClick} />
                );
            }))}
            {showGlobalActions && <GlobalActions />}
        </div>
    );

    return (
        <main className={mainClassName}>
            <header className='sticky top-0 z-50 flex h-18 items-center justify-between gap-5 bg-white p-6'>
                <nav>{left}</nav>
                <div>{globalActions}</div>
            </header>
            <section className='mx-auto w-full flex-auto'>
                {children}
            </section>
        </main>
    );
};

export default PageToolbar;