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
    stickyHeader?: boolean;
    headerBorder?: boolean;
    border?: boolean;
    footerBorder?:boolean;
    footer?: React.ReactNode;
    stickyFooter?: boolean;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
    columns,
    rows,
    stickyHeader = false,
    headerBorder = true,
    border = true,
    footer,
    footerBorder = true,
    stickyFooter = false
}) => {
    let headerColID = 0;
    let rowID = 0;

    const tableClasses = clsx(
        'h-full max-h-full min-w-full flex-auto border-collapse'
    );

    const thClasses = clsx(
        'bg-white py-3 pr-3 text-left',
        headerBorder && 'border-b border-grey-200',
        stickyHeader && 'sticky top-0'
    );

    const tdClasses = clsx(
        'w-full py-3 pr-3',
        border && 'border-b border-grey-200'
    );

    const footerClasses = clsx(
        'bg-white',
        footer && 'py-3',
        stickyFooter && 'sticky bottom-0',
        footerBorder && 'border-t border-grey-200'
    );

    return (
        // Outer container for testing. Should not be part of the table component
        <div className='h-[40vh]'>

            <div className='relative flex max-h-full w-full flex-col overflow-x-auto'>
                <table className={tableClasses}>
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
                                    <th key={'head-' + headerColID} className={thClasses} style={thStyles}>
                                        <Heading className='truncate' level={6}>{column.title}</Heading>
                                    </th>);
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            let colID = 0;
                            rowID = rowID + 1;
                            return <tr key={'row-' + rowID}>
                                {row.cells.map((cell) => {
                                    let customTdClasses;
                                    if (columns[colID] !== undefined) {
                                        customTdClasses = clsx(
                                            tdClasses,
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
                <footer className={footerClasses}>
                    {footer}
                </footer>
            </div>

        </div>
    );
};

export default DynamicTable;