import Heading from './Heading';
import Hint from './Hint';
import Pagination from './Pagination';
import React from 'react';
import Separator from './Separator';
import clsx from 'clsx';
import {LoadingIndicator} from './LoadingIndicator';
import {PaginationData} from '../../hooks/usePagination';

interface TableProps {
    /**
     * If the table is the primary content on a page (e.g. Members table) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;
    children?: React.ReactNode;
    borderTop?: boolean;
    hint?: string;
    hintSeparator?: boolean;
    className?: string;
    isLoading?: boolean;
    pagination?: PaginationData;
}

const OptionalPagination = ({pagination}: {pagination?: PaginationData}) => {
    if (!pagination) {
        return null;
    }

    return <Pagination {...pagination}/>;
};

const Table: React.FC<TableProps> = ({children, borderTop, hint, hintSeparator, pageTitle, className, pagination, isLoading}) => {
    const tableClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        'w-full',
        pageTitle ? 'mb-0 mt-14' : 'my-0',
        className
    );

    // We want to avoid layout jumps when we load a new page of the table, or when data is invalidated
    const table = React.useRef<HTMLTableElement>(null);
    const [tableHeight, setTableHeight] = React.useState<number | undefined>(undefined);

    React.useEffect(() => {
        // Add resize observer to table
        if (table.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                const height = entries[0].target.clientHeight;
                setTableHeight(height);
            });
            resizeObserver.observe(table.current);
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [isLoading]);

    const loadingStyle = React.useMemo(() => {
        if (tableHeight === undefined) {
            return undefined;
        }

        return {
            height: tableHeight
        };
    }, [tableHeight]);

    return (
        <>
            <div className='w-full overflow-x-auto'>
                {pageTitle && <Heading>{pageTitle}</Heading>}
              
                {/* TODO: make this div have the same height across all pages */}
                <div>
                  {!isLoading && <table ref={table} className={tableClasses}>
                      <tbody>
                          {children}
                      </tbody>
                  </table>}
              </div>

                {isLoading && <LoadingIndicator delay={200} size='lg' style={loadingStyle} />}

                {(hint || pagination) &&
                <div className="-mt-px">
                    {(hintSeparator || pagination) && <Separator />}
                    <div className="flex flex-col-reverse items-start justify-between gap-1 pt-2 md:flex-row md:items-center md:gap-0 md:pt-0">
                        <Hint>{hint ?? ' '}</Hint>
                        <OptionalPagination pagination={pagination} />
                    </div>
                </div>}
            </div>
        </>
    );
};

export default Table;
