import React from 'react';
import {LucideIcon, TableHeadButton} from '@tryghost/shade';

interface SortButtonProps<T extends string> {
    sortBy: T;
    setSortBy: (sort: T) => void;
    activeSortBy: T;
    children: React.ReactNode;
}

const SortButton = <T extends string>({
    sortBy,
    setSortBy,
    activeSortBy,
    children
}: SortButtonProps<T>) => {
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
