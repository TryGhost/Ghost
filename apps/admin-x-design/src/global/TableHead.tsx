import clsx from 'clsx';
import React, {HTMLProps} from 'react';
import Heading from './Heading';

export type TableHeadProps = HTMLProps<HTMLTableCellElement>

const TableHead: React.FC<TableHeadProps> = ({className, children, colSpan, ...props}) => {
    const tableCellClasses = clsx(
        '!py-2 !pl-0 !pr-6 text-left align-top',
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
