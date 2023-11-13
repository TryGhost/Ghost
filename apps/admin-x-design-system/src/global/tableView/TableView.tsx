import React from 'react';
import {Tab, TabList} from '../TabView';
import Heading, {HeadingLevel} from '../Heading';

interface TableViewProps {
    leftHeaderType?: 'text' | 'tabs' | 'custom',
    leftHeaderTextSize?: HeadingLevel,
    leftHeaderContent?: string | Array<Tab> | React.ReactNode;
    selectedTab?: string;
    onTabChange?: (id: string) => void;
    children?: React.ReactNode;
}

const TableView: React.FC<TableViewProps> = ({
    leftHeaderType = 'text',
    leftHeaderTextSize = 5,
    leftHeaderContent = '',
    selectedTab = '',
    onTabChange,
    children
}) => {
    let leftContent = <></>;
    let mainContent:React.ReactNode = <></>;

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    if (leftHeaderType === 'text' && typeof leftHeaderContent === 'string') {
        leftContent = <Heading level={leftHeaderTextSize!}>{leftHeaderContent}</Heading>;
        mainContent = children;
    } else if (leftHeaderType === 'tabs' && Array.isArray(leftHeaderContent)) {
        leftContent = <TabList
            border={false}
            buttonBorder={true}
            handleTabChange={handleTabChange}
            selectedTab={selectedTab}
            tabs={leftHeaderContent}
            width='normal'
        />;
        mainContent = <>
            {leftHeaderContent.map((tab) => {
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
        </>;
    }

    return (
        <section>
            <div className='flex items-end justify-between border-b border-grey-200'>
                <div>{leftContent}</div>
                <div>right</div>
            </div>
            {}
            {mainContent}
        </section>
    );
};

export default TableView;