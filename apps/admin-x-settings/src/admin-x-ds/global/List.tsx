import Heading from './Heading';
import Hint from './Hint';
import React from 'react';
import Separator from './Separator';
import clsx from 'clsx';

interface ListProps {
    /**
     * If the list is the primary content on a page (e.g. Members list) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;

    /**
     * When you use the list in a block and it's not the primary content of the page then you can set a title to the list
     */
    title?: React.ReactNode;
    titleSeparator?: boolean;
    children?: React.ReactNode;
    hint?: React.ReactNode;
    hintSeparator?: boolean;
    borderTop?: boolean;
}

const List: React.FC<ListProps> = ({title, titleSeparator, children, hint, hintSeparator, borderTop, pageTitle}) => {
    titleSeparator = (titleSeparator === undefined) ? true : titleSeparator;
    hintSeparator = (hintSeparator === undefined) ? true : hintSeparator;

    const listClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        pageTitle && 'mt-14'
    );

    return (
        <>
            {pageTitle && <Heading>{pageTitle}</Heading>}
            <section className={listClasses}>
                {(!pageTitle && title) &&
                    <div className='flex flex-col gap-1'>
                        <Heading grey={true} level={6}>{title}</Heading>
                        {titleSeparator && <Separator />}
                    </div>
                }
                <div className='flex flex-col'>
                    {children}
                </div>
                {hint &&
                <>
                    {hintSeparator && <Separator />}
                    <Hint>{hint}</Hint>
                </>
                }
            </section>
        </>
    );
};

export default List;