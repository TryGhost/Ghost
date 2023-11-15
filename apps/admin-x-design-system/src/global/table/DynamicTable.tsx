import React from 'react';
import {Heading} from '../..';
import clsx from 'clsx';

export type DynamicTableColumn = {
    title: string;
    minWidth?: string;
    maxWidth?: string;
    noWrap?: boolean;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
}

export type DynamicTableRow = {
    cells: React.ReactNode[];
}

interface DynamicTableProps {
    columns: DynamicTableColumn[];
    rows: DynamicTableRow[];
    absolute?: boolean;
    stickyHeader?: boolean;
    headerBorder?: boolean;
    border?: boolean;
    footerBorder?:boolean;
    footer?: React.ReactNode;
    stickyFooter?: boolean;
    containerClassName?: string;
    tableContainerClassName?: string;
    tableClassName?: string;
    thClassName?: string;
    tdClassName?: string;
    trClassName?: string;
    footerClassName?: string;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
    columns,
    rows,
    absolute = false,
    stickyHeader = false,
    headerBorder = true,
    border = true,
    footer,
    footerBorder = true,
    stickyFooter = false,
    containerClassName,
    tableContainerClassName,
    tableClassName,
    thClassName,
    tdClassName,
    trClassName,
    footerClassName
}) => {
    let headerColID = 0;
    let rowID = 0;

    containerClassName = clsx(
        'flex max-h-full w-full flex-col',
        (stickyHeader || stickyFooter || absolute) ? 'absolute inset-0' : 'relative',
        containerClassName
    );

    tableContainerClassName = clsx(
        'flex-auto overflow-x-auto',
        tableContainerClassName
    );

    tableClassName = clsx(
        'h-full max-h-full min-w-full flex-auto border-collapse',
        tableClassName
    );

    thClassName = clsx(
        'bg-white py-3 pr-3 text-left',
        headerBorder && 'border-b border-grey-200',
        stickyHeader && 'sticky top-0',
        thClassName
    );

    tdClassName = clsx(
        'w-full py-3 pr-3',
        border && 'border-b border-grey-200',
        tdClassName
    );

    trClassName = clsx(
        'hover:bg-gradient-to-r hover:from-white hover:to-grey-50 dark:hover:from-black dark:hover:to-grey-950',
        trClassName
    );

    footerClassName = clsx(
        'bg-white',
        footer && 'py-3',
        stickyFooter && 'sticky inset-x-0 bottom-0',
        footerBorder && 'border-t border-grey-200',
        footerClassName
    );

    return (
    // Outer container for testing. Should not be part of the table component
    // <div className='h-[40vh]'>

        <div className={containerClassName}>
            <div className={tableContainerClassName}>
                <table className={tableClassName}>
                    <thead>
                        <tr>
                            {columns.map((column) => {
                                headerColID = headerColID + 1;
                                const thMaxWidth: string = column.maxWidth || 'auto';
                                const thStyles = {
                                    maxWidth: thMaxWidth,
                                    width: thMaxWidth
                                };
                                return (
                                    <th key={'head-' + headerColID} className={thClassName} style={thStyles}>
                                        <Heading className='truncate' level={6}>{column.title}</Heading>
                                    </th>);
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            let colID = 0;
                            rowID = rowID + 1;
                            return <tr key={'row-' + rowID} className={trClassName}>
                                {row.cells.map((cell) => {
                                    let customTdClasses;
                                    if (columns[colID] !== undefined) {
                                        customTdClasses = clsx(
                                            tdClassName,
                                            columns[colID].noWrap ? 'truncate' : '',
                                            columns[colID].align === 'center' && 'text-center',
                                            columns[colID].align === 'right' && 'text-right',
                                            columns[colID].valign === 'top' && 'align-top',
                                            columns[colID].valign === 'middle' && 'align-center',
                                            columns[colID].valign === 'bottom' && 'align-bottom'
                                        );
                                    }

                                    if (rowID === rows.length && footerBorder) {
                                        customTdClasses = clsx(
                                            customTdClasses,
                                            'border-none'
                                        );
                                    }

                                    const tdMaxWidth: string = (columns[colID] !== undefined && columns[colID].maxWidth) || 'auto';
                                    const tdStyles = {
                                        maxWidth: tdMaxWidth,
                                        width: tdMaxWidth
                                    };
                                    const data = (
                                        <td key={colID} className={customTdClasses} style={tdStyles}>
                                            {cell}
                                        </td>
                                    );
                                    colID = colID + 1;
                                    return data;
                                })}
                            </tr>;
                        })}
                    </tbody>
                </table>
            </div>
            <footer className={footerClassName}>
                {footer}
            </footer>
        </div>

    // </div>
    );
};

export default DynamicTable;