import React from 'react';
import {LucideIcon, TableHeadButton} from '@tryghost/shade';

type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';

interface SortButtonProps {
    sortBy: TopPostsOrder;
    setSortBy: (sort: TopPostsOrder) => void;
    activeSortBy: TopPostsOrder;
    children: React.ReactNode;
}

const SortButton:React.FC<SortButtonProps> = ({
    sortBy,
    setSortBy,
    activeSortBy,
    children
}) => {
    return (
        <TableHeadButton
            className={`${sortBy === activeSortBy && 'text-black'}`}
            onClick={() => {
                setSortBy(sortBy);
            }}
        >
            {children}
            {sortBy === activeSortBy && <LucideIcon.ArrowUp />}
        </TableHeadButton>
    );
};

export default SortButton;
