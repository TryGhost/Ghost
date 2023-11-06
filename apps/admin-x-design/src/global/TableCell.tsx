import React, {HTMLProps} from 'react';
import clsx from 'clsx';

interface TableCellProps extends HTMLProps<HTMLTableCellElement> {
    padding?: boolean;
}

const TableCell: React.FC<TableCellProps> = ({className, children, padding = true, ...props}) => {
    const tableCellClasses = clsx(
        padding ? '!py-3 !pl-0 !pr-6' : '',
        'align-top',
        props.onClick && 'hover:cursor-pointer',
        className
    );

    return (
        <td className={tableCellClasses} {...props}>
            {children}
        </td>
    );
};

export default TableCell;
