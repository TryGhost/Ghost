import React from 'react';
import clsx from 'clsx';

export type Tab<ID = string> = {
    id: ID;
    title: string;
    counter?: number | null;

    /**
     * Optional, so you can just use the tabs to other views
    */
    contents?: React.ReactNode;
}

interface TabViewProps<ID = string> {
    tabs: readonly Tab<ID>[];
    onTabChange: (id: ID) => void;
    selectedTab?: ID;
    border?: boolean;
    width?: 'narrow' | 'normal' | 'wide';
}

function TabView<ID extends string = string>({
    tabs,
    onTabChange,
    selectedTab,
    border = true,
    width = 'normal'
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

    const containerClasses = clsx(
        'no-scrollbar flex w-full overflow-x-auto',
        width === 'narrow' && 'gap-3',
        width === 'normal' && 'gap-5',
        width === 'wide' && 'gap-7',
        border && 'border-b border-grey-300 dark:border-grey-900'
    );

    return (
        <section>
            <div className={containerClasses} role='tablist'>
                {tabs.map(tab => (
                    <div>
                        <button
                            key={tab.id}
                            aria-selected={selectedTab === tab.id}
                            className={clsx(
                                '-m-b-px cursor-pointer appearance-none whitespace-nowrap py-1 text-sm transition-all after:invisible after:block after:h-px after:overflow-hidden after:font-bold after:text-transparent after:content-[attr(title)] dark:text-white',
                                border && 'border-b-[3px]',
                                selectedTab === tab.id && border ? 'border-black dark:border-white' : 'border-transparent hover:border-grey-500',
                                selectedTab === tab.id && 'font-bold'
                            )}
                            id={tab.id}
                            role='tab'
                            title={tab.title}
                            type="button"
                            onClick={handleTabChange}
                        >
                            {tab.title}
                            {(typeof tab.counter === 'number') && <span className='ml-1.5 rounded-full bg-grey-200 px-1.5 py-[2px] text-xs font-normal text-grey-800 dark:bg-grey-900 dark:text-grey-300'>{tab.counter}</span>}
                        </button>
                    </div>
                ))}
            </div>
            {tabs.map((tab) => {
                return (
                    <>
                        {tab.contents &&
                            <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                                <div>{tab.contents}</div>
                            </div>
                        }
                    </>
                );
            })}
        </section>
    );
};

export default TabView;
