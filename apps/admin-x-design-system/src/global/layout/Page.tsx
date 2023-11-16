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
        'absolute inset-0 h-[100vh] w-[100vw] overflow-y-auto overflow-x-hidden',
        mainClassName
    );

    const globalActions = (
        <div className='flex items-center gap-7'>
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
            <header className='flex items-center justify-between gap-5 p-6'>
                <nav>{left}</nav>
                <div>{globalActions}</div>
            </header>
            <section className='mx-auto max-w-7xl p-6 pt-[3vmin]'>
                {children}
            </section>
        </main>
    );
};

export default PageToolbar;