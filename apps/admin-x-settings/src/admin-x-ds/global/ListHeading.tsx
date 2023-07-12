import Heading from './Heading';
import React from 'react';
import Separator from './Separator';

interface ListHeadingProps {
    title?: React.ReactNode;
    actions?: React.ReactNode;
    titleSeparator?: boolean;
}

const ListHeading: React.FC<ListHeadingProps> = ({title, actions, titleSeparator}) => {
    let heading;

    if (title) {
        const headingTitle = <Heading grey={true} level={6}>{title}</Heading>;
        heading = actions ? (
            <div className='flex items-end justify-between gap-2'>
                {headingTitle}
                {actions}
            </div>
        ) : headingTitle;
    }

    if (heading || titleSeparator) {
        return (
            <div className='flex flex-col items-stretch gap-1'>
                {heading}
                {titleSeparator && <Separator />}
            </div>
        );
    }

    return <></>;
};

export default ListHeading;