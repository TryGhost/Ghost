import React from 'react';
import clsx from 'clsx';

export type Tab = {
    id: string;
    title: string;

    /**
     * Optional, so you can just use the tabs to other views
    */
    contents?: React.ReactNode;
}

interface TabViewProps {
    tabs: Tab[];
    onTabChange: (id: string) => void;
    selectedTab?: string;
    border?:boolean;
    width?: 'narrow' | 'normal' | 'wide';
}

const TabView: React.FC<TabViewProps> = ({
    tabs,
    onTabChange,
    selectedTab,
    border = true,
    width = 'normal'
}) => {
    if (tabs.length !== 0 && selectedTab === undefined) {
        selectedTab = tabs[0].id;
    }

    if (tabs.length === 0) {
        return (<></>);
    }

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id;
        onTabChange(newTab);
    };

    const containerClasses = clsx(
        'flex',
        width === 'narrow' && 'gap-3',
        width === 'normal' && 'gap-5',
        width === 'wide' && 'gap-7',
        border && 'border-b border-grey-300'
    );

    return (
        <section>
            <div className={containerClasses} role='tablist'>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        aria-selected={selectedTab === tab.id}
                        className={clsx(
                            '-m-b-px cursor-pointer appearance-none py-1 text-sm transition-all after:invisible after:block after:h-px after:overflow-hidden after:font-bold after:text-transparent after:content-[attr(title)]',
                            border && 'border-b-[3px]',
                            selectedTab === tab.id && border ? 'border-black' : 'border-transparent hover:border-grey-500',
                            selectedTab === tab.id && 'font-bold'
                        )}
                        id={tab.id}
                        role='tab'
                        title={tab.title}
                        type="button"
                        onClick={handleTabChange}
                    >{tab.title}</button>
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
