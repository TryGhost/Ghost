import * as TabsPrimitive from '@radix-ui/react-tabs';
import clsx from 'clsx';
import React from 'react';
import Icon from './Icon';

export type Tab<ID = string> = {
    id: ID;
    title: string;
    icon?: string;
    counter?: number | null;
    tabWrapperClassName?: string;
    containerClassName?: string;

    /**
     * Optional, so you can just use the tabs to other views
    */
    contents?: React.ReactNode;
}

export type TabWidth = 'narrow' | 'normal' | 'wide';

export interface TabButtonProps<ID = string> {
    id: ID,
    title: string;
    onClick?: (e:React.MouseEvent<HTMLButtonElement>) => void;
    border?: boolean;
    icon?: string;
    counter?: number | null;
}

export const TabButton: React.FC<TabButtonProps> = ({
    id,
    title,
    onClick,
    border,
    icon,
    counter
}) => {
    return (
        <TabsPrimitive.Trigger
            className={clsx(
                '-m-b-px cursor-pointer appearance-none whitespace-nowrap py-1 text-md font-medium text-grey-700 transition-all after:invisible after:block after:h-px after:overflow-hidden after:font-bold after:text-transparent after:content-[attr(title)] data-[state=active]:font-bold data-[state=active]:text-black dark:text-white [&>span]:data-[state=active]:text-black',
                border && 'border-b-2 border-transparent hover:border-grey-500 data-[state=active]:border-black data-[state=active]:dark:border-white'
            )}
            id={id}
            role='tab'
            title={title}
            value={id}
            onClick={onClick}
        >
            {icon && <Icon className='mb-0.5 mr-1.5 inline' name={icon} size='sm' />}
            {title}
            {(typeof counter === 'number') &&
                <span className='ml-1.5 rounded-full bg-grey-200 px-1.5 py-[2px] text-xs font-medium text-grey-800 dark:bg-grey-900 dark:text-grey-300'>
                    {new Intl.NumberFormat().format(counter)}
                </span>
            }
        </TabsPrimitive.Trigger>
    );
};

export interface TabListProps<ID = string> {
    tabs: readonly Tab<ID>[];
    width: TabWidth;
    handleTabChange?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    border: boolean;
    buttonBorder?: boolean;
    selectedTab?: ID,
    topRightContent?: React.ReactNode,
    stickyHeader?: boolean
}

export const TabList: React.FC<TabListProps> = ({
    tabs,
    width = 'normal',
    handleTabChange,
    border,
    buttonBorder,
    topRightContent,
    stickyHeader
}) => {
    const containerClasses = clsx(
        'no-scrollbar mb-px flex w-full overflow-x-auto',
        width === 'narrow' && 'gap-3',
        width === 'normal' && 'gap-5',
        width === 'wide' && 'gap-7',
        border && 'border-b border-grey-300 dark:border-grey-900'
    );
    return (
        <TabsPrimitive.List className={`${stickyHeader ? 'sticky top-0 z-50 bg-white dark:bg-black' : ''}`}>
            <div className={containerClasses} role='tablist'>
                {tabs.map(tab => (
                    <div>
                        <TabButton
                            border={buttonBorder}
                            counter={tab.counter}
                            icon={tab.icon}
                            id={tab.id}
                            title={tab.title}
                            onClick={handleTabChange}
                        />
                    </div>
                ))}
                {topRightContent !== null ?
                    <div className='ml-auto'>{topRightContent}</div> :
                    null
                }
            </div>
        </TabsPrimitive.List>
    );
};

export interface TabViewProps<ID = string> {
    tabs: readonly Tab<ID>[];
    onTabChange: (id: ID) => void;
    selectedTab?: ID;
    border?: boolean;
    buttonBorder?: boolean;
    width?: TabWidth;
    containerClassName?: string;
    topRightContent?: React.ReactNode;
    stickyHeader?: boolean;
    testId?: string;
}

function TabView<ID extends string = string>({
    testId,
    tabs,
    onTabChange,
    selectedTab,
    border = true,
    buttonBorder = border,
    width = 'normal',
    containerClassName,
    topRightContent,
    stickyHeader
}: TabViewProps<ID>) {
    if (tabs.length !== 0 && selectedTab === undefined) {
        selectedTab = tabs[0].id;
    }

    if (tabs.length === 0) {
        return (<></>);
    }

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as ID;
        onTabChange(newTab);
    };

    return (
        <TabsPrimitive.Root className={containerClassName} data-testid={testId} value={selectedTab}>
            <TabList
                border={border}
                buttonBorder={buttonBorder}
                handleTabChange={handleTabChange}
                selectedTab={selectedTab}
                stickyHeader={stickyHeader}
                tabs={tabs}
                topRightContent={topRightContent}
                width={width}
            />
            {tabs.map((tab) => {
                return (
                    <TabsPrimitive.Content className={tab.tabWrapperClassName} value={tab.id}>
                        <div className={tab.containerClassName}>{tab.contents}</div>
                    </TabsPrimitive.Content>
                );
            })}
        </TabsPrimitive.Root>
    );
};

export default TabView;
