import PropTypes from 'prop-types';
import React, {useState} from 'react';

const TabView = ({tabs, defaultTab, tabContent}) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    return (
        <>
            <div className="no-scrollbar flex w-full gap-5 border-b border-grey-300 px-6 dark:border-grey-900">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`-mb-px cursor-pointer appearance-none whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'border-black text-black dark:border-white dark:text-white'
                                : 'border-transparent text-grey-600 hover:border-grey-500 dark:text-white'
                        }`}
                        data-testid={`tab-${tab.id}`}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-3 p-6">
                {tabContent[activeTab]}
            </div>
        </>
    );
};

TabView.propTypes = {
    tabs: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired
        })
    ).isRequired,
    defaultTab: PropTypes.string,
    tabContent: PropTypes.objectOf(PropTypes.node).isRequired
};

export {TabView};