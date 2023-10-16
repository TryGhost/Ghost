import Heading from './Heading';
import Hint from './Hint';
import Pagination from './Pagination';
import React from 'react';
import Separator from './Separator';
import TableRow from './TableRow';
import clsx from 'clsx';
import {LoadingIndicator} from './LoadingIndicator';
import {PaginationData} from '../../hooks/usePagination';

export interface ShowMoreData {
    hasMore: boolean;
    loadMore: () => void;
}

interface TableProps {
    /**
     * If the table is the primary content on a page (e.g. Members table) then you can set a pagetitle to be consistent
     */
    pageTitle?: string;
    header?: React.ReactNode;
    children?: React.ReactNode;
    borderTop?: boolean;
    hint?: React.ReactNode;
    hintSeparator?: boolean;
    className?: string;
    isLoading?: boolean;
    pagination?: PaginationData;
    showMore?: ShowMoreData;
}

const OptionalPagination = ({pagination}: {pagination?: PaginationData}) => {
    if (!pagination) {
        return null;
    }

    return <Pagination {...pagination}/>;
};

const OptionalShowMore = ({showMore}: {showMore?: ShowMoreData}) => {
    if (!showMore) {
        return null;
    } else if (!showMore.hasMore) {
        return <div></div>;
    }

    return (
        <div className={`mt-1 flex items-center gap-2 text-sm font-bold text-green hover:text-green-400`}>
            <button type='button' onClick={showMore.loadMore}>Show all</button>
        </div>
    );
};

const Table: React.FC<TableProps> = ({header, children, borderTop, hint, hintSeparator, pageTitle, className, pagination, showMore, isLoading}) => {
    const tableClasses = clsx(
        (borderTop || pageTitle) && 'border-t border-grey-300',
        'w-full overflow-x-auto',
        pageTitle ? 'mb-0 mt-14' : 'my-0',
        className
    );

    const table = React.useRef<HTMLTableSectionElement>(null);
    const maxTableHeight = React.useRef(0);
    const [tableHeight, setTableHeight] = React.useState<number | undefined>(undefined);

    const multiplePages = pagination && pagination.pages && pagination.pages > 1;

    // Observe the height of the table content. This is used to:
    // 1) avoid layout jumps when loading a new page of the table
    // 2) keep the same table height between pages, cf. https://github.com/TryGhost/Product/issues/3881
    React.useEffect(() => {
        if (table.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                const height = entries[0].target.clientHeight;
                setTableHeight(height);

                if (height > maxTableHeight.current) {
                    maxTableHeight.current = height;
                }
            });

            resizeObserver.observe(table.current);

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [isLoading, pagination]);

    const loadingStyle = React.useMemo(() => {
        if (tableHeight === undefined) {
            return {
                height: 'auto'
            };
        }

        return {
            height: maxTableHeight.current
        };
    }, [tableHeight]);

    const spaceHeightStyle = React.useMemo(() => {
        if (tableHeight === undefined) {
            return {
                height: 0
            };
        }

        return {
            height: maxTableHeight.current - tableHeight
        };
    }, [tableHeight]);

    return (
        <>
            <div className='w-full'>
                {pageTitle && <Heading>{pageTitle}</Heading>}

                <table className={tableClasses}>
                    {header && <thead className='border-b border-grey-200 dark:border-grey-600'>
                        <TableRow bgOnHover={false} separator={false}>{header}</TableRow>
                    </thead>}
                    {!isLoading && <tbody ref={table}>
                        {children}
                    </tbody>}

                    {multiplePages && <div style={spaceHeightStyle} />}
                </table>

                {isLoading && <LoadingIndicator delay={200} size='lg' style={loadingStyle} />}

                {(hint || pagination || showMore) &&
                <div className="-mt-px">
                    {(hintSeparator || pagination) && <Separator />}
                    <div className="mt-1 flex flex-col-reverse items-start justify-between gap-1 pt-2 md:flex-row md:items-center md:gap-0 md:pt-0">
                        <OptionalShowMore showMore={showMore} />
                        <Hint>{hint ?? ' '}</Hint>
                        <OptionalPagination pagination={pagination} />
                    </div>
                </div>}
            </div>
        </>
    );
};

export default Table;
