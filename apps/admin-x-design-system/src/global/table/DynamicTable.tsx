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
    hidden?: boolean;
    disableRowClick?: boolean;
}

export type DynamicTableRow = {
    cells: React.ReactNode[];
    onClick?: () => void;
}

export interface DynamicTableProps {
    columns: DynamicTableColumn[];
    rows: DynamicTableRow[];
    absolute?: boolean;
    stickyHeader?: boolean;
    headerBorder?: boolean;

    /**
     * Set this parameter if the table is the main content in a viewcontainer or on a page
     */
    singlePageTable?: boolean;

    border?: boolean;
    footerBorder?:boolean;
    footer?: React.ReactNode;
    stickyFooter?: boolean;
    containerClassName?: string;
    tableContainerClassName?: string;
    tableClassName?: string;
    thClassName?: string;
    tdClassName?: string;
    cellClassName?: string;
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
    singlePageTable = false,
    containerClassName,
    tableContainerClassName,
    tableClassName,
    thClassName,
    tdClassName,
    cellClassName,
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
        (singlePageTable && (stickyHeader || stickyFooter || absolute)) && 'px-6 xl:px-[calc((100%-1280px)/2+24px)]',
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
        'w-full',
        border && 'border-b border-grey-200',
        tdClassName
    );

    cellClassName = clsx(
        'flex h-full py-3 pr-3',
        cellClassName
    );

    trClassName = clsx(
        'group hover:bg-gradient-to-r hover:from-white hover:to-grey-50 dark:hover:from-black dark:hover:to-grey-950',
        trClassName
    );

    footerClassName = clsx(
        'bg-white',
        (singlePageTable && stickyFooter) && 'mx-6 xl:mx-[calc((100%-1280px)/2+24px)]',
        footer && 'py-3',
        stickyFooter && 'sticky inset-x-0 bottom-0',
        footerBorder && 'border-t border-grey-200',
        footerClassName
    );

    const footerContents = <footer className={footerClassName}>{footer}</footer>;

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
                                    const currentColumn: DynamicTableColumn = columns[colID] || {title: ''};

                                    let customTdClasses = tdClassName;
                                    customTdClasses = clsx(
                                        customTdClasses,
                                        currentColumn.noWrap ? 'truncate' : '',
                                        currentColumn.align === 'center' && 'text-center',
                                        currentColumn.align === 'right' && 'text-right'
                                    );

                                    if (rowID === rows.length && footerBorder) {
                                        customTdClasses = clsx(
                                            customTdClasses,
                                            'border-none'
                                        );
                                    }

                                    const tdMaxWidth: string = (currentColumn !== undefined && currentColumn.maxWidth) || 'auto';
                                    const tdStyles = {
                                        maxWidth: tdMaxWidth,
                                        width: tdMaxWidth
                                    };
                                    let customCellClasses = cellClassName;
                                    customCellClasses = clsx(
                                        customCellClasses,
                                        currentColumn.valign === 'middle' || !currentColumn.valign && 'items-center',
                                        currentColumn.valign === 'top' && 'items-start',
                                        currentColumn.valign === 'bottom' && 'items-end'
                                    );
                                    if (row.onClick && !currentColumn.disableRowClick) {
                                        customCellClasses = clsx(
                                            customCellClasses,
                                            'cursor-pointer'
                                        );
                                    }
                                    if (currentColumn.hidden) {
                                        customCellClasses = clsx(
                                            customCellClasses,
                                            'opacity-0 group-hover:opacity-100'
                                        );
                                    }
                                    const data = (
                                        <td key={colID} className={customTdClasses} style={tdStyles}>
                                            <div className={customCellClasses} onClick={(row.onClick && !currentColumn.disableRowClick) ? row.onClick : (() => {})}>{cell}</div>
                                        </td>
                                    );
                                    colID = colID + 1;
                                    return data;
                                })}
                            </tr>;
                        })}
                    </tbody>
                </table>
                {!stickyFooter && footerContents}
            </div>
            {stickyFooter && footerContents}
        </div>

    // </div>
    );
};

export default DynamicTable;