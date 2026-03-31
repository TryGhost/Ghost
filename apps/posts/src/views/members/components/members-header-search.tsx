import React from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput, LucideIcon} from '@tryghost/shade';

interface MembersHeaderSearchProps {
    search: string;
    onSearchChange: (search: string) => void;
    autoFocus?: boolean;
}

const MembersHeaderSearch: React.FC<MembersHeaderSearchProps> = ({
    search,
    onSearchChange,
    autoFocus = false
}) => {
    return (
        <InputGroup className="min-w-0 basis-full lg:w-[240px] lg:basis-auto">
            <InputGroupAddon>
                <LucideIcon.Search className="size-4" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
                aria-label="Search members"
                autoFocus={autoFocus}
                placeholder="Search members..."
                value={search}
                onChange={event => onSearchChange(event.target.value)}
            />
        </InputGroup>
    );
};

export default MembersHeaderSearch;
