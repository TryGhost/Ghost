import clsx from 'clsx';
import React, {forwardRef} from 'react';

export const tableRowHoverBgClasses = 'hover:bg-gradient-to-r hover:from-white hover:to-grey-50 dark:hover:from-black dark:hover:to-grey-950';

export interface TableRowProps {
    id?: string;
    action?: React.ReactNode;
    hideActions?: boolean;
    className?: string;
    style?: React.CSSProperties;
    testId?: string;

    /**
     * Hidden for the last item in the table
     */
    separator?: boolean;

    bgOnHover?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow({id, action, hideActions, className, style, testId, separator, bgOnHover = true, onClick, children}, ref) {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
    };

    separator = (separator === undefined) ? true : separator;
    const tableRowClasses = clsx(
        'group/table-row',
        bgOnHover && tableRowHoverBgClasses,
        onClick && 'cursor-pointer',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent hover:border-grey-200 dark:border-grey-950 dark:hover:border-grey-900' : 'border-y border-none first-of-type:hover:border-t-transparent',
        className
    );

    return (
        <tr ref={ref} className={tableRowClasses} data-testid={testId} id={id} style={style} onClick={handleClick}>
            {children}
            {action &&
                <td className={`w-[1%] whitespace-nowrap p-0 hover:cursor-pointer`}>
                    <div className={`visible flex items-center justify-end py-3 pr-6 ${hideActions ? 'group-hover/table-row:visible md:invisible' : ''}`}>
                        {action}
                    </div>
                </td>
            }
        </tr>
    );
});

export default TableRow;
