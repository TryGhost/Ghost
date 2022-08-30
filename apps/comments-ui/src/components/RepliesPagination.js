import React from 'react';

const RepliesPagination = (props) => {
    const loadMore = props.loadMore;
    const count = props.count;

    return (
        <button className="group my-10 flex w-full items-center text-left font-sans text-md font-semibold text-neutral-700 dark:text-white sm:mt-0" onClick={loadMore} data-testid="reply-pagination-button">
            <span className="mr-4 whitespace-nowrap">↓ Show {count} more {count === 1 ? 'reply' : 'replies'}</span>
        </button>
    );
};

export default RepliesPagination;
