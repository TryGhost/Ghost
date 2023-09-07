import React from 'react';
import clsx from 'clsx';

interface TableRowProps {
    id?: string;
    action?: React.ReactNode;
    hideActions?: boolean;
    className?: string;
    testId?: string;

    /**
     * Hidden for the last item in the table
     */
    separator?: boolean;

    bgOnHover?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
}

const TableRow: React.FC<TableRowProps> = ({id, action, hideActions, className, testId, separator, bgOnHover = true, onClick, children}) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
    };

    separator = (separator === undefined) ? true : separator;
    const tableRowClasses = clsx(
        'group/table-row',
        bgOnHover && 'hover:bg-gradient-to-r hover:from-white hover:to-grey-50',
        onClick && 'cursor-pointer',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent hover:border-grey-200' : 'border-y border-transparent first-of-type:hover:border-t-transparent',
        className
    );

    return (
        <tr className={tableRowClasses} data-testid={testId} id={id} onClick={handleClick}>
            {children}
            {action &&
                <td className={`px-6 py-3`}>
                    <div className={`flex items-center justify-end ${hideActions ? 'invisible group-hover/table-row:visible' : ''}`}>
                        {action}
                    </div>
                </td>
            }
        </tr>
    );
};

export default TableRow;
