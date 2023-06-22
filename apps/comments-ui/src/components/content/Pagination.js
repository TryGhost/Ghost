import React, {useContext} from 'react';
import {formatNumber} from '../../utils/helpers';
import AppContext from '../../AppContext';

const Pagination = () => {
    const {pagination, dispatchAction} = useContext(AppContext);

    const loadMore = () => {
        dispatchAction('loadMoreComments');
    };

    if (!pagination) {
        return null;
    }

    const left = pagination.total - pagination.page * pagination.limit;

    if (left <= 0) {
        return null;
    }

    return (
        <button data-testid="pagination-component" type="button" className="group mb-10 flex w-full items-center px-0 pb-2 pt-0 text-left font-sans text-md font-semibold text-neutral-700 dark:text-white" onClick={loadMore}>
            <span className="flex h-[39px] w-full items-center justify-center whitespace-nowrap rounded-[6px] bg-[rgba(0,0,0,0.05)] px-3 py-2 text-center font-sans text-sm font-semibold text-neutral-700 outline-0 transition-[opacity,background] duration-150 hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.08)] dark:text-neutral-100 dark:hover:bg-[rgba(255,255,255,0.1)]">↑ Show {formatNumber(left)} previous {left === 1 ? 'comment' : 'comments'}</span>
        </button>
    );
};

export default Pagination;
