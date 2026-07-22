import clsx from 'clsx';
import React from 'react';
import Heading from './heading';
import ListHeading, {ListHeadingSize} from './list-heading';
import Separator from './separator';

export interface ListProps {
    /**
     * If the list is the primary content on a page (e.g. Members list) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;

    /**
     * When you use the list in a block and it's not the primary content of the page then you can set a title to the list
     */
    title?: React.ReactNode;
    titleSize?: ListHeadingSize;
    titleSeparator?: boolean;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    hint?: React.ReactNode;
    hintSeparator?: boolean;
    borderTop?: boolean;
    className?: string;
}

const List: React.FC<ListProps> = ({
    title,
    titleSeparator = true,
    titleSize = 'sm',
    children,
    actions,
    hint,
    hintSeparator = true,
    borderTop,
    pageTitle,
    className
}) => {
    const listClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        pageTitle && 'mt-5',
        className
    );

    return (
        <>
            {pageTitle && <Heading>{pageTitle}</Heading>}
            <section className={listClasses}>
                {title && <ListHeading actions={actions} title={title} titleSeparator={!pageTitle && titleSeparator && !borderTop} titleSize={titleSize} />}
                <div className='flex flex-col'>
                    {children}
                </div>
                {hint &&
                <div className='-mt-px'>
                    {hintSeparator && <Separator />}
                    <div className='mt-1 inline-block leading-snug text-grey-700 dark:text-grey-600'>{hint}</div>
                </div>
                }
            </section>
        </>
    );
};

export default List;
