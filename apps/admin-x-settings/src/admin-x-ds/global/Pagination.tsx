import Icon from './Icon';
import React from 'react';

interface PaginationProps {
    itemsPerPage: number;
    itemsTotal: number;
}

const Pagination: React.FC<PaginationProps> = ({itemsPerPage, itemsTotal}) => {
    /* If there is less than X items total, where X is the number of items per page that we want to show */
    if (itemsPerPage < itemsTotal) {
        return (
            <div className={`flex items-center gap-2 text-xs text-grey-700`}>Showing 1-{itemsPerPage} of {itemsTotal} 
                <button type='button'><Icon className="h-[10px] w-[10px] opacity-50 [&>path]:stroke-[3px]" colorClass="text-green" name='chevron-left' />
                </button>
                <button className="cursor-pointer" type="button"><Icon className="h-[10px] w-[10px] [&>path]:stroke-[3px]" colorClass="text-green" name='chevron-right' /></button>
            </div>
        );
            
    /* If there is more than X items total, where X is the number of items per page that we want to show */
    } else {
        return (
            <div className={`mt-1 flex items-center gap-2 text-xs text-grey-700`}>Showing {itemsTotal} in total
            </div>
        );
    }
};

export default Pagination;