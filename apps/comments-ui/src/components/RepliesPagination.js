import React from 'react';

const RepliesPagination = (props) => {
    const loadMore = props.loadMore;
    const count = props.count;

    return (
        <button className="w-full text-neutral-700 font-semibold px-0 pt-0 pb-3 mb-10 font-sans text-md text-left dark:text-white flex items-center " onClick={loadMore}>
            <span className="whitespace-nowrap mr-4">↓ Show {count} more replies</span>
            <span className="inline-block w-full bg-neutral-100 dark:bg-[rgba(255,255,255,0.08)] rounded h-[3px] mt-[3px]" />
        </button>
    );
};

export default RepliesPagination;
