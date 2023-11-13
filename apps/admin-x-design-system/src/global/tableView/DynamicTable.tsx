import React from 'react';
import {Tab, TabList} from '../TabView';
import Heading, {HeadingLevel} from '../Heading';

export interface DynamicTableView {
    id: string;
    viewName: string;
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
    children
}) => {
    let heading = <></>;
    let mainContent:React.ReactNode = <></>;
    let viewSwitcher = <></>;

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    if (headingType === 'text' && typeof headingContent === 'string') {
        heading = <Heading level={headingTextSize!}>{headingContent}</Heading>;
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
                        viewSwitcher = <>
                            {tab.views.map((view) => {
                                return (
                                    <button key={view.id} type='button' onClick={() => {
                                        alert(tab.id + '/' + view.id);
                                    }}>{view.viewName}</button>
                                );
                            })}
                        </>;
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

    const actions = <div className='flex gap-2'>
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