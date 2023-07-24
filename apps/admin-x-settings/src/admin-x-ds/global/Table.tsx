import Heading from './Heading';
import React from 'react';
import clsx from 'clsx';

interface TableProps {
    /**
     * If the table is the primary content on a page (e.g. Members table) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;
    children?: React.ReactNode;
    borderTop?: boolean;
    className?: string;
}

const Table: React.FC<TableProps> = ({children, borderTop, pageTitle, className}) => {
    const tableClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        'w-full',
        pageTitle ? 'mb-0 mt-14' : 'my-0',
        className
    );

    return (
        <>
            {pageTitle && <Heading>{pageTitle}</Heading>}
            <table className={tableClasses}>
                <tbody>
                    {children}
                </tbody>
            </table>
        </>
    );
};

export default Table;