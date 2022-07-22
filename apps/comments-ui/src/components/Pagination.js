import React, {useContext} from 'react';
import AppContext from '../AppContext';

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
        <button className="transition-[background-color] duration-200 ease-out w-full rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-3 py-3.5 mb-12 font-sans text-md text-center dark:bg-[rgba(255,255,255,0.08)] dark:text-white" onClick={loadMore}>
            ↑ Show {left} previous comments
        </button>
    );
};

export default Pagination;
