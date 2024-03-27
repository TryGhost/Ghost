import clsx from 'clsx';
import React from 'react';

export type Tab<ID = string> = {
    id: ID;
    title: string;
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
    selected: boolean;
    border?: boolean;
    counter?: number | null;
}

export const TabButton: React.FC<TabButtonProps> = ({
    id,
    title,
    onClick,
    selected,
    border,
    counter
}) => {
    return (
        <button
            key={id}
            aria-selected={selected}
            className={clsx(
                '-m-b-px cursor-pointer appearance-none whitespace-nowrap py-1 text-sm transition-all after:invisible after:block after:h-px after:overflow-hidden after:font-bold after:text-transparent after:content-[attr(title)] dark:text-white',
                border && 'border-b-[3px]',
                selected && border ? 'border-black dark:border-white' : 'border-transparent hover:border-grey-500',
                selected && 'font-bold'
            )}
            id={id}
            role='tab'
            title={title}
            type="button"
            onClick={onClick}
        >
            {title}
            {(typeof counter === 'number') && <span className='ml-1.5 rounded-full bg-grey-200 px-1.5 py-[2px] text-xs font-normal text-grey-800 dark:bg-grey-900 dark:text-grey-300'>{counter}</span>}
        </button>
    );
};

export interface TabListProps<ID = string> {
    tabs: readonly Tab<ID>[];
    width: TabWidth;
    handleTabChange?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    border: boolean;
    buttonBorder?: boolean;
    selectedTab?: ID
}

export const TabList: React.FC<TabListProps> = ({
    tabs,
    width = 'normal',
    handleTabChange,
    border,
    buttonBorder,
    selectedTab
}) => {
    const containerClasses = clsx(
        'no-scrollbar flex w-full overflow-x-auto',
        width === 'narrow' && 'gap-3',
        width === 'normal' && 'gap-5',
        width === 'wide' && 'gap-7',
        border && 'border-b border-grey-300 dark:border-grey-900'
    );
    return (
        <div className={containerClasses} role='tablist'>
            {tabs.map(tab => (
                <div>
                    <TabButton
                        border={buttonBorder}
                        counter={tab.counter}
                        id={tab.id}
                        selected={selectedTab === tab.id}
                        title={tab.title}
                        onClick={handleTabChange}
                    />
                </div>
            ))}
        </div>
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
    containerClassName
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
        <section className={containerClassName} data-testid={testId}>
            <TabList
                border={border}
                buttonBorder={buttonBorder}
                handleTabChange={handleTabChange}
                selectedTab={selectedTab}
                tabs={tabs}
                width={width}
            />
            {tabs.map((tab) => {
                return (
                    <>
                        {tab.contents &&
                            <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'} ${tab.tabWrapperClassName}`} role='tabpanel'>
                                <div className={tab.containerClassName}>{tab.contents}</div>
                            </div>
                        }
                    </>
                );
            })}
        </section>
    );
};

export default TabView;
