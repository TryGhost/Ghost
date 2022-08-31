import React, {useContext} from 'react';
import AppContext from '../../AppContext';

const Pagination = (props) => {
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
        <button className="group mb-10 flex w-full items-center px-0 pt-0 pb-2 text-left font-sans text-md font-semibold text-neutral-700 dark:text-white " onClick={loadMore}>
            <span className="mr-4 whitespace-nowrap">↑ Show {left} previous {left === 1 ? 'comment' : 'comments'}</span>
            <span className="mt-[3px] inline-block h-[3px] w-full rounded bg-neutral-100 transition-[background-color] duration-200 ease-out group-hover:bg-neutral-200 dark:bg-[rgba(255,255,255,0.05)]" />
        </button>
    );
};

export default Pagination;
