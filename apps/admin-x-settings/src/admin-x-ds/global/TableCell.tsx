import React, {HTMLProps} from 'react';
import clsx from 'clsx';

const TableCell: React.FC<HTMLProps<HTMLTableCellElement>> = ({className, children, ...props}) => {
    const tableCellClasses = clsx(
        '!py-3 !pl-0 !pr-6 align-top',
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
