import React from 'react';
import {Tab, TabList} from '../TabView';
import Heading, {HeadingLevel} from '../Heading';
import clsx from 'clsx';

export interface DynamicTableView {
    id: string;
    buttonClasses?: string;
    buttonChildren: React.ReactNode;
    contents: React.ReactNode;
}

export interface DynamicTableTab extends Tab {
    views?: DynamicTableView[];
}

interface DynamicTableProps {
    headingType?: 'text' | 'tabs' | 'custom',
    headingTextSize?: HeadingLevel,
    headingContent?: string | React.ReactNode;
    tabs?: DynamicTableTab[];
    selectedTab?: string;
    selectedView?: string;
    onTabChange?: (id: string) => void;
    onViewChange?: (id: string) => void;
    children?: React.ReactNode;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
    headingType = 'text',
    headingTextSize = 1,
    headingContent = '',
    tabs,
    selectedTab,
    selectedView,
    onTabChange,
    onViewChange,
    children
}) => {
    let heading = <></>;
    let mainContent:React.ReactNode = <></>;
    let viewSwitcher = <></>;

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    const handleViewChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newView = e.currentTarget.id as string;
        onViewChange!(newView);
    };

    if (headingType === 'text' && typeof headingContent === 'string') {
        heading = <div className='pb-1'><Heading level={headingTextSize!}>{headingContent}</Heading></div>;
    } else if (headingType === 'tabs') {
        heading = <TabList
            border={false}
            buttonBorder={true}
            handleTabChange={handleTabChange}
            selectedTab={selectedTab}
            tabs={tabs!}
            width='normal'
        />;
    }

    if (tabs?.length) {
        if (!selectedTab) {
            selectedTab = tabs[0].id;
        }

        mainContent = <>
            {tabs.map((tab) => {
                if (tab.views?.length) {
                    if (!selectedView) {
                        selectedView = tab.views[0].id;
                    }

                    if (selectedTab === tab.id) {
                        viewSwitcher = <div className='flex items-center gap-2'>
                            {tab.views.map((view) => {
                                const buttonClasses = clsx(
                                    'cursor-pointer',
                                    selectedView === view.id ? 'text-black' : 'text-grey-500',
                                    view.buttonClasses
                                );
                                return (
                                    <button key={view.id} className={buttonClasses} id={view.id} type='button' onClick={handleViewChange}>{view.buttonChildren}</button>
                                );
                            })}
                        </div>;
                    }

                    return (
                        <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                            {tab.views.map((view) => {
                                return (<>
                                    {view.contents &&
                                        <div key={view.id} className={`${selectedView === view.id ? 'block' : 'hidden'}`} role='tabpanel'>
                                            {view.contents}
                                        </div>
                                    }
                                </>);
                            })}
                        </div>
                    );
                } else {
                    return (
                        <>
                            {tab.contents &&
                                <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                                    <div>{tab.contents}</div>
                                </div>
                            }
                        </>
                    );
                }
            })}
        </>;
    } else if (children) {
        mainContent = children;
    }

    const actions = <div className='flex gap-5 pb-2'>
        {viewSwitcher}
    </div>;

    return (
        <section>
            <div className='flex items-end justify-between border-b border-grey-200'>
                {heading}
                {actions}
            </div>
            {}
            {mainContent}
        </section>
    );
};

export default DynamicTable;