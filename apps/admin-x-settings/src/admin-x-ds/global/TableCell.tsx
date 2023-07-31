import React from 'react';
import clsx from 'clsx';

interface TableCellProps {
    className?: string;
    children?: React.ReactNode;
}

const TableCell: React.FC<TableCellProps> = ({className, children}) => {
    const tableCellClasses = clsx(
        '!py-3 !pl-0 !pr-6 align-top',
        className
    );

    return (
        <td className={tableCellClasses}>
            {children}
        </td>
    );
};

export default TableCell;
