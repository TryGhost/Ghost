import Heading from './Heading';
import React, {HTMLProps} from 'react';
import clsx from 'clsx';

const TableHead: React.FC<HTMLProps<HTMLTableCellElement>> = ({className, children, ...props}) => {
    const tableCellClasses = clsx(
        '!py-3 !pl-0 !pr-6 align-top',
        props.onClick && 'hover:cursor-pointer',
        className
    );

    return (
        <td className={tableCellClasses} {...props}>
            <Heading level={6}>{children}</Heading>
        </td>
    );
};

export default TableHead;
