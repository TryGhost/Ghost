import React from 'react';

const RepliesPagination = (props) => {
    const loadMore = props.loadMore;
    const count = props.count;

    return (
        <button className="group w-full text-neutral-700 font-semibold mt-10 sm:mt-0 mb-10 font-sans text-md text-left dark:text-white flex items-center " onClick={loadMore} data-testid="reply-pagination-button">
            <span className="whitespace-nowrap mr-4">↓ Show {count} more {count === 1 ? 'reply' : 'replies'}</span>
        </button>
    );
};

export default RepliesPagination;
