import {Button, Input, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useDebounce} from 'use-debounce';
import {useState} from 'react';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Member picker for the activity screen. Port of the Ember
 * MembersActivity::MemberFilter component: search members by name/email to
 * filter the activity feed down to one member, and show a clear affordance
 * while a member is selected.
 */
export function MemberFilter({memberSelected, onChange}: {
    memberSelected: boolean;
    onChange: (memberId: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch] = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

    const {data, isLoading} = useBrowseMembers({
        searchParams: {
            limit: '20',
            order: 'created_at desc',
            ...(debouncedSearch ? {search: debouncedSearch} : {})
        },
        enabled: open,
        defaultErrorHandler: false
    });
    const members = data?.members ?? [];

    if (memberSelected) {
        return (
            <Button data-testid="member-filter-clear" type="button" variant="outline" onClick={() => onChange(null)}>
                All members
                <LucideIcon.X aria-hidden="true" className="size-4" />
            </Button>
        );
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setSearchInput('');
        }
    };

    const handleSelect = (memberId: string) => {
        onChange(memberId);
        handleOpenChange(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button data-testid="member-filter-button" type="button" variant="outline">
                    <LucideIcon.User className="size-4" />
                    All members
                    <LucideIcon.ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
                <Input
                    aria-label="Search members"
                    data-testid="member-filter-search-input"
                    placeholder="Search members..."
                    value={searchInput}
                    autoFocus
                    onChange={event => setSearchInput(event.target.value)}
                />
                <div aria-label="Members" className="mt-2 max-h-72 overflow-y-auto" role="listbox">
                    {members.map(member => (
                        <button
                            key={member.id}
                            aria-selected={false}
                            className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                            role="option"
                            type="button"
                            onClick={() => handleSelect(member.id)}
                        >
                            {member.name && <span className="font-semibold">{member.name}</span>}
                            <span className="text-muted-foreground">{member.email}</span>
                        </button>
                    ))}
                    {!isLoading && members.length === 0 && (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">No members found</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
