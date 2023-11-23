import React from 'react';
import {TabList} from '../TabView';
import clsx from 'clsx';
import AppMenu from './AppMenu';
import GlobalActions from './GlobalActions';
import Button from '../Button';
import {BreadcrumbsProps} from '../Breadcrumbs';
import PageHeader from './PageHeader';

export interface PageTab {
    id: string;
    title: string;
}

export interface CustomGlobalAction {
    iconName: string;
    onClick?: () => void;
}

interface PageProps {
    mainContainerClassName?: string;
    mainClassName?: string;
    fullBleedPage?: boolean;

    /**
     * The pageToolbar is a WIP part of this component, it's unused ATM in Ghost Admin.
     */
    pageToolbarClassName?: string;
    fullBleedToolbar?: boolean;

    /**
     * TK. Part of the Page Toolbar
     */
    showAppMenu?: boolean;

    /**
     * Show
     */
    showGlobalActions?: boolean;

    /**
     * TK. Part of the Page Toolbar
     */
    customGlobalActions?: CustomGlobalAction[];
    breadCrumbs?: React.ReactElement<BreadcrumbsProps>;

    /**
     * TK. Part of the Page Toolbar
     */
    pageTabs?: PageTab[],

    /**
     * TK. Part of the Page Toolbar
     */
    selectedTab?: string;

    /**
     * TK. Part of the Page Toolbar
     */
    onTabChange?: (id: string) => void;

    children?: React.ReactNode;
}

/**
 * The page component is the main container in Ghost Admin. It consists of a
 * page level toolbar (`pageToolbar` — unused ATM, it's for page level views and
 * navigation in the future), and the main content area.
 *
 * ### Examples
 * You can find several examples in the sidebar. If you're building a page for the
 * current Admin you can use the ["List in Current Admin"](/story/global-layout-page--example-current-admin-list)
 * example as a starting point. The rest of the examples are showing a potential direction for a
 * future structure.
 */
const Page: React.FC<PageProps> = ({
    fullBleedPage = true,
    mainContainerClassName,
    mainClassName,
    pageToolbarClassName,
    fullBleedToolbar = true,
    showAppMenu = false,
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

    const left: React.ReactNode = (
        (showAppMenu || breadCrumbs || pageTabs?.length) && <div className='flex items-center gap-10'>
            {showAppMenu && (
                <AppMenu />
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
        </div>);

    mainClassName = clsx(
        'flex w-full flex-auto flex-col',
        mainClassName
    );

    const globalActions = (
        (customGlobalActions?.length || showGlobalActions) &&
        <div className='sticky flex items-center gap-7'>
            {(customGlobalActions?.map((action) => {
                return (
                    <Button icon={action.iconName} iconColorClass='text-black dark:text-white' size='sm' link onClick={action.onClick} />
                );
            }))}
            {showGlobalActions && <GlobalActions />}
        </div>);

    mainContainerClassName = clsx(
        'flex h-[100vh] w-full flex-col overflow-y-auto overflow-x-hidden',
        !fullBleedPage && 'mx-auto max-w-7xl',
        mainContainerClassName
    );

    pageToolbarClassName = clsx(
        'sticky top-0 z-50 flex h-22 min-h-[92px] w-full items-center justify-between gap-5 bg-white p-8 dark:bg-black',
        !fullBleedToolbar && 'mx-auto max-w-7xl',
        pageToolbarClassName
    );

    return (
        <div className={mainContainerClassName}>
            {(left || globalActions) &&
                <PageHeader
                    containerClassName={pageToolbarClassName}
                    left={left}
                    right={globalActions}
                />
            }
            <main className={mainClassName}>
                {children}
            </main>
        </div>
    );
};

export default Page;