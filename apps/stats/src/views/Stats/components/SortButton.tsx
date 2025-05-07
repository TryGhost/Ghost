import React from 'react';
import {LucideIcon, TableHeadButton} from '@tryghost/shade';

interface SortButtonProps {
    sortBy: string;
    setSortBy: (sort: string) => void;
    activeSortBy: string;
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
