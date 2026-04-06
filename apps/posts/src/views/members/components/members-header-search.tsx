import React from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

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
        <InputGroup className='h-(--control-height) min-w-0 basis-full rounded-full bg-surface-elevated focus:bg-surface-elevated has-[[data-slot=input-group-control]:focus-visible]:bg-surface-elevated lg:w-[180px] lg:basis-auto xl:w-[240px]'>
            <InputGroupAddon>
                <LucideIcon.Search className="size-4" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
                aria-label={ariaLabel}
                autoFocus={autoFocus}
                placeholder="Search members..."
                value={search}
                onChange={event => onSearchChange(event.target.value)}
            />
        </InputGroup>
    );
};

export default MembersHeaderSearch;
