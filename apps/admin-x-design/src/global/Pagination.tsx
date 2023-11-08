import React from 'react';
import {PaginationData} from '../hooks/usePagination';
import Icon from './Icon';

export type PaginationProps = PaginationData

const Pagination: React.FC<PaginationProps> = ({page, limit, total, prevPage, nextPage}) => {
    // Detect loading state
    const startIndex = (page - 1) * limit + 1;
    const endIndex = total ? Math.min(total, startIndex + limit - 1) : (startIndex + limit - 1);

    const hasNext = total ? endIndex < total : false;
    const hasPrev = page > 1;

    /* If there is less than X items total, where X is the number of items per page that we want to show */
    if (total && limit < total) {
        return (
            <div className={`mt-1 flex items-center gap-2 text-xs text-grey-700`}>Showing {startIndex}-{endIndex} of {total}
                <button type='button' onClick={prevPage}><Icon className={`h-[10px] w-[10px] [&>path]:stroke-[3px] ${!hasPrev ? 'cursor-default opacity-50' : 'hover:text-green-700 cursor-pointer'}`} colorClass="text-green" name='chevron-left' />
                </button>
                <button type="button" onClick={nextPage}><Icon className={`h-[10px] w-[10px] [&>path]:stroke-[3px] ${!hasNext ? 'cursor-default opacity-50' : 'hover:text-green-700 cursor-pointer'}`} colorClass="text-green" name='chevron-right' /></button>
            </div>
        );

    /* If there is more than X items total, where X is the number of items per page that we want to show */
    } else {
        return (
            <div className={`mt-1 flex items-center gap-2 text-xs text-grey-700`}>Showing {total ?? '?'} in total
            </div>
        );
    }
};

export default Pagination;
