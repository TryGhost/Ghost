import React from 'react';
import Heading from './Heading';
import Separator from './Separator';

export type ListHeadingSize = 'sm' | 'lg';

export interface ListHeadingProps {
    title?: React.ReactNode;
    titleSize?: ListHeadingSize,
    actions?: React.ReactNode;
    titleSeparator?: boolean;
}

const ListHeading: React.FC<ListHeadingProps> = ({
    title,
    titleSize = 'sm',
    actions,
    titleSeparator
}) => {
    let heading;

    if (title) {
        const headingTitle = titleSize === 'sm' ?
            <Heading grey={true} level={6}>{title}</Heading>
            :
            <Heading level={5}>{title}</Heading>;
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
