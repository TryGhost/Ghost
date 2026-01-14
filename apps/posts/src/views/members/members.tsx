import MembersContent from './components/members-content';
import MembersFilters from './components/members-filters';
import MembersHeader from './components/members-header';
import MembersLayout from './components/members-layout';
import MembersList from './components/members-list';
import React, {useEffect, useState} from 'react';
import {
    Button,
    EmptyIndicator,
    LoadingIndicator,
    LucideIcon
} from '@tryghost/shade';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useFilterState} from './hooks/use-filter-state';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const Members: React.FC = () => {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    const {filters, nql, setFilters} = useFilterState();

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState<'include' | 'exclude'>(
        'include'
    );

    const handleSelect = (id: string, selected: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (selected) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectionMode('exclude');
            setSelectedIds(new Set());
        } else {
            setSelectionMode('include');
            setSelectedIds(new Set());
        }
    };

    const resetSelection = () => {
        setSelectionMode('include');
        setSelectedIds(new Set());
    };

    // Reset selection when search/filters change
    useEffect(() => {
        resetSelection();
    }, [search, nql]);

    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useBrowseMembers({
        searchParams: {
            ...(debouncedSearch ? {search: debouncedSearch} : {}),
            ...(nql ? {filter: nql} : {})
        }
    });

    return (
        <MembersLayout>
            <MembersHeader
                nql={nql}
                resetSelection={resetSelection}
                search={debouncedSearch}
                selectedIds={selectedIds}
                selectionMode={selectionMode}
                totalMembers={data?.meta?.pagination.total ?? 0}
            >
                <MembersFilters
                    filters={filters}
                    search={search}
                    onFiltersChange={setFilters}
                    onSearchChange={setSearch}
                />
            </MembersHeader>
            <MembersContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading members
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : !data?.members.length && !search ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyIndicator
                            actions={
                                <Button asChild>
                                    <a href="#/members/new">
                                        Create a new member
                                    </a>
                                </Button>
                            }
                            title="Start building your audience"
                        >
                            <LucideIcon.Users />
                        </EmptyIndicator>
                    </div>
                ) : !data?.members.length && search ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyIndicator
                            title={`No members found for "${search}"`}
                        >
                            <LucideIcon.Search />
                        </EmptyIndicator>
                    </div>
                ) : (
                    <MembersList
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        items={data?.members ?? []}
                        selectedIds={selectedIds}
                        selectionMode={selectionMode}
                        totalItems={data?.meta?.pagination?.total ?? 0}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                    />
                )}
            </MembersContent>
        </MembersLayout>
    );
};

export default Members;
