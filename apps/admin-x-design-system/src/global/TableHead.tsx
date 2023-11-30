import clsx from 'clsx';
import React, {HTMLProps} from 'react';
import Heading from './Heading';

export interface TableHeadProps extends HTMLProps<HTMLTableCellElement> {
    sticky?: boolean;
}

const TableHead: React.FC<TableHeadProps> = ({
    className,
    children,
    colSpan,
    sticky = false,
    ...props
}) => {
    const tableCellClasses = clsx(
        '!py-2 !pl-0 !pr-6 text-left align-top',
        sticky && 'sticky top-0 bg-white',
        props.onClick && 'hover:cursor-pointer',
        className
    );

    return (
        <th className={tableCellClasses} colSpan={colSpan} {...props}>
            <Heading className='whitespace-nowrap' level={6}>{children}</Heading>
        </th>
    );
};

export default TableHead;
