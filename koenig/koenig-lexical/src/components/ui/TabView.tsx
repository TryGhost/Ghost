import React, {useState} from 'react';

interface Tab {
    id: string;
    label: string;
}

interface TabViewProps {
    tabs: Tab[];
    defaultTab?: string;
    tabContent: Record<string, React.ReactNode>;
}

const TabView = ({tabs, defaultTab, tabContent}: TabViewProps) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    return (
        <>
            <div className={`no-scrollbar flex gap-4 border-b border-grey-300 dark:border-grey-900 ${tabs.length > 1 ? 'w-full px-6' : 'mx-6'}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`-mb-px appearance-none whitespace-nowrap pb-3 pt-4 text-sm font-semibold transition-all ${
                            tabs.length > 1 ? 'cursor-pointer border-b-2' : 'cursor-default'
                        } ${
                            activeTab === tab.id
                                ? 'border-black text-black dark:border-white dark:text-white'
                                : 'border-transparent text-grey-600 hover:border-grey-500 dark:text-grey-500 dark:hover:border-grey-500'
                        }`}
                        data-testid={`tab-${tab.id}`}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-3 p-6 pt-4" data-testid={`tab-contents-${activeTab}`}>
                {tabContent[activeTab]}
            </div>
        </>
    );
};

export {TabView};
