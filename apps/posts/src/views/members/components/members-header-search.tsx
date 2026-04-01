import React from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput, LucideIcon} from '@tryghost/shade';

interface MembersHeaderSearchProps {
    search: string;
    onSearchChange: (search: string) => void;
    autoFocus?: boolean;
    ariaLabel?: string;
}

const MembersHeaderSearch: React.FC<MembersHeaderSearchProps> = ({
    search,
    onSearchChange,
    autoFocus = false,
    ariaLabel = 'Search members'
}) => {
    return (
        <InputGroup className="h-[34px] min-w-0 basis-full lg:w-[180px] lg:basis-auto xl:w-[240px]">
            <InputGroupAddon>
                <LucideIcon.Search className="size-4" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
                aria-label={ariaLabel}
                autoFocus={autoFocus}
                className='!h-[34px]'
                placeholder="Search members..."
                value={search}
                onChange={event => onSearchChange(event.target.value)}
            />
        </InputGroup>
    );
};

export default MembersHeaderSearch;
