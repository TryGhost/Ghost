import React from 'react';
import {Tab} from '../TabView';
import Heading, {HeadingLevel} from '../Heading';

interface TableViewProps {
    headerLeft?: {
        type?: 'text' | 'tabs' | 'custom',
        textSize?: HeadingLevel,
        content?: string | Array<Tab> | React.ReactNode;
    };
    children?: React.ReactNode;
}

const TableView: React.FC<TableViewProps> = ({
    headerLeft = {
        type: 'text',
        textSize: 5,
        content: ''
    },
    children
}) => {
    let headerLeftContent = <></>;

    if (headerLeft?.type === 'text' && typeof headerLeft.content === 'string') {
        headerLeftContent = <Heading level={headerLeft.textSize!}>{headerLeft.content}</Heading>;
    } else if (headerLeft?.type === 'tabs' && Array.isArray(headerLeft.content)) {
        headerLeftContent = <>tabs</>;
    }

    return (
        <section>
            <div className='flex items-end justify-between border-b border-grey-200 pb-1'>
                <div>{headerLeftContent}</div>
                <div>right</div>
            </div>
            {children}
        </section>
    );
};

export default TableView;