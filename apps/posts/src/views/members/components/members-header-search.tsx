import React, {useEffect, useRef, useState} from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput, LucideIcon} from '@tryghost/shade';
import {useDebounce} from 'use-debounce';

const SEARCH_DEBOUNCE_MS = 250;

interface MembersHeaderSearchProps {
    search: string;
    onSearchChange: (search: string) => void;
}

const MembersHeaderSearch: React.FC<MembersHeaderSearchProps> = ({
    search,
    onSearchChange
}) => {
    const [inputValue, setInputValue] = useState(search);
    const [debouncedSearch] = useDebounce(inputValue, SEARCH_DEBOUNCE_MS);
    const latestSearchRef = useRef(search);

    useEffect(() => {
        latestSearchRef.current = search;
        setInputValue(search);
    }, [search]);

    useEffect(() => {
        if (debouncedSearch !== latestSearchRef.current) {
            onSearchChange(debouncedSearch);
        }
    }, [debouncedSearch, onSearchChange]);

    return (
        <InputGroup className="min-w-0 basis-full sm:w-[19rem] sm:basis-auto">
            <InputGroupAddon>
                <LucideIcon.Search className="size-4" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
                aria-label="Search members"
                placeholder="Search members..."
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
            />
        </InputGroup>
    );
};

export default MembersHeaderSearch;
