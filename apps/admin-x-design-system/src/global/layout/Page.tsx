import React from 'react';
import {TabList} from '../TabView';
import clsx from 'clsx';
import PageMenu from './PageMenu';
import GlobalActions from './GlobalActions';
import Button from '../Button';
import {BreadcrumbsProps} from '../Breadcrumbs';

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
    breadCrumbs?: React.ReactElement<BreadcrumbsProps>;
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
    breadCrumbs,
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
        {breadCrumbs}
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
        'flex h-[calc(100%-72px)] w-[100vw] flex-auto flex-col',
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
        <div className='w-100 h-[100vh] overflow-y-auto overflow-x-hidden'>
            <header className='sticky top-0 z-50 flex h-18 items-center justify-between gap-5 bg-white p-6'>
                <nav>{left}</nav>
                <div>{globalActions}</div>
            </header>
            <main className={mainClassName}>
                <section className='mx-auto flex h-full w-full flex-col'>
                    {children}
                </section>
            </main>
        </div>
    );
};

export default PageToolbar;