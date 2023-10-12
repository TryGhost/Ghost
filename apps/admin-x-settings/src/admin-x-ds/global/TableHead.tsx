import Heading from './Heading';
import React, {HTMLProps} from 'react';
import clsx from 'clsx';

const TableHead: React.FC<HTMLProps<HTMLTableCellElement>> = ({className, children, colSpan, ...props}) => {
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