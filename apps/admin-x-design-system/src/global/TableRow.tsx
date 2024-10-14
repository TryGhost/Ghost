import clsx from 'clsx';
import React, {forwardRef} from 'react';

export const tableRowHoverBgClasses = 'before:absolute before:inset-x-[-16px] before:top-[-1px] before:bottom-0 before:bg-grey-50 before:opacity-0 hover:before:opacity-100 before:rounded-md before:transition-opacity dark:before:bg-grey-950 hover:z-10';

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
        'group/table-row relative',
        bgOnHover && tableRowHoverBgClasses,
        onClick && 'cursor-pointer',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent dark:border-grey-950' : 'border-y border-none first-of-type:hover:border-t-transparent',
        'hover:border-b-transparent',
        className
    );

    return (
        <tr ref={ref} className={tableRowClasses} data-testid={testId} id={id} style={style} onClick={handleClick}>
            <td className="p-0" colSpan={1000}>
                <div className="relative z-10 flex items-center">
                    <div className="grow py-2">{children}</div>
                    {action &&
                        <div className={`flex items-center justify-end p-2${hideActions ? ' opacity-0 group-hover/table-row:opacity-100' : ''}`}>
                            {action}
                        </div>
                    }
                </div>
            </td>
        </tr>
    );
});

export default TableRow;
