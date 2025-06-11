import React from 'react';
import {Heading} from '../..';
import clsx from 'clsx';
import {tableRowHoverBgClasses} from '../TableRow';

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
    horizontalScrolling?: boolean;
    absolute?: boolean;
    stickyHeader?: boolean;
    hideHeader?: boolean;
    headerBorder?: boolean;

    /**
     * Set this parameter if the table is the main content in a viewcontainer or on a page
     */
    singlePageTable?: boolean;
    pageHasSidebar?: boolean;

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
    horizontalScrolling = false,
    absolute = false,
    stickyHeader = false,
    hideHeader = false,
    headerBorder = true,
    border = true,
    footer,
    footerBorder = true,
    stickyFooter = false,
    singlePageTable = false,
    pageHasSidebar = true,
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
        !horizontalScrolling && 'w-full max-w-full',
        (singlePageTable && (stickyHeader || stickyFooter || absolute)) && `px-[4vw] tablet:px-12 ${pageHasSidebar ? 'min-[1640px]:px-[calc((100%-1320px)/2+48px)]' : 'xl:px-[calc((100%-1320px)/2+48px)]'}`,
        tableContainerClassName
    );

    tableClassName = clsx(
        'h-full max-h-full min-w-full flex-auto table-fixed',
        tableClassName
    );

    thClassName = clsx(
        'last-child:pr-5 bg-white py-3 text-left dark:bg-black [&:not(:first-child)]:pl-5',
        thClassName
    );

    tdClassName = clsx(
        'dark:group-hover:border-grey-900 w-full border-b group-hover:border-grey-200',
        border ? 'border-grey-200 dark:border-grey-900' : 'border-transparent',
        tdClassName
    );

    cellClassName = clsx(
        'flex h-full py-4',
        cellClassName
    );

    trClassName = clsx(
        'group',
        tableRowHoverBgClasses,
        trClassName
    );

    footerClassName = clsx(
        'bg-white dark:bg-black',
        (singlePageTable && stickyFooter) && `mx-[4vw] tablet:mx-12 ${pageHasSidebar ? 'min-[1640px]:mx-[calc((100%-1320px)/2+48px)]' : 'xl:mx-[calc((100%-1320px)/2+48px)]'}`,
        footer && 'py-4',
        stickyFooter && 'sticky inset-x-0 bottom-0',
        footerBorder && 'border-t border-grey-200 dark:border-grey-900',
        footerClassName
    );

    const footerContents = <footer className={footerClassName}>{footer}</footer>;

    return (
    // Outer container for testing. Should not be part of the table component
    // <div className='h-[40vh]'>

        <div className={containerClassName}>
            <div className={tableContainerClassName}>
                <table className={tableClassName}>
                    {!hideHeader &&
                    <thead className={stickyHeader ? 'sticky top-0' : ''}>
                        <tr>
                            {columns.map((column) => {
                                headerColID = headerColID + 1;
                                const thMaxWidth: string = column.maxWidth || 'auto';
                                const thMinWidth: string = column.minWidth || 'auto';
                                const thStyles = {
                                    maxWidth: thMaxWidth,
                                    minWidth: thMinWidth,
                                    width: thMaxWidth
                                };
                                return (
                                    <th key={'head-' + headerColID} className={thClassName} style={thStyles}>
                                        <Heading className='truncate' level={6}>{column.title}</Heading>
                                    </th>);
                            })}
                        </tr>
                        {headerBorder && (
                            <tr>
                                <th className='h-px bg-grey-200 p-0 dark:bg-grey-900' colSpan={columns.length}></th>
                            </tr>
                        )}
                    </thead>
                    }
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
                                        // currentColumn.noWrap ? 'truncate' : '',
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
                                    const tdMinWidth: string = (currentColumn !== undefined && currentColumn.minWidth) || 'auto';
                                    const tdStyles = {
                                        maxWidth: tdMaxWidth,
                                        minWidth: tdMinWidth,
                                        width: tdMaxWidth
                                    };
                                    let customCellClasses = cellClassName;
                                    customCellClasses = clsx(
                                        customCellClasses,
                                        colID !== 0 && 'pl-5',
                                        (colID === columns.length - 1) && 'pr-5',
                                        currentColumn.noWrap ? 'truncate' : '',
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
