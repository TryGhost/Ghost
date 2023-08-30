import Heading from './Heading';
import Hint from './Hint';
import React from 'react';
import Separator from './Separator';
import clsx from 'clsx';

interface TableProps {
    /**
     * If the table is the primary content on a page (e.g. Members table) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;
    children?: React.ReactNode;
    borderTop?: boolean;
    hint?: string;
    hintSeparator?: boolean;
    className?: string;
}

const Table: React.FC<TableProps> = ({children, borderTop, hint, hintSeparator, pageTitle, className}) => {
    const tableClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        'w-full',
        pageTitle ? 'mb-0 mt-14' : 'my-0',
        className
    );

    return (
        <>
            <div>
                {pageTitle && <Heading>{pageTitle}</Heading>}
                <table className={tableClasses}>
                    <tbody>
                        {children}
                    </tbody>
                </table>
                {hint &&
                <div className='mt-1'>
                    {hintSeparator && <Separator />}
                    <div className="flex justify-between">
                        <Hint>{hint}</Hint>
                        {/* // TODO: Finish pagination component */}
                        {/* <div className={`mt-1 flex items-center gap-2 text-xs text-grey-700`}>Showing 1-5 of 15 
                            <button type='button'><Icon colorClass="text-green" name='chevron-left' size="xs" />
                            </button>
                            <button type="button"><Icon colorClass="text-green" name='chevron-right' size="xs" /></button>
                        </div> */}
                    </div>
                </div>}
            </div>
        </>
    );
};

export default Table;