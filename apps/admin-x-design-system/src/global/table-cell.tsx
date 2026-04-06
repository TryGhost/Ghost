import clsx from 'clsx';
import React, {HTMLProps} from 'react';

export interface TableCellProps extends HTMLProps<HTMLTableCellElement> {
    padding?: boolean;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
}

const TableCell: React.FC<TableCellProps> = ({
    className,
    children,
    padding = true,
    align = 'left',
    valign = 'top',
    ...props
}) => {
    const tableCellClasses = clsx(
        padding ? 'py-3! pr-6! pl-0!' : '',
        (align === 'center' && 'text-center'),
        (align === 'right' && 'text-right'),
        (valign === 'top' && 'align-top'),
        (valign === 'middle' && 'align-middle'),
        (valign === 'bottom' && 'align-bottom'),
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
