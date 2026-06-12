import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {useDebounce} from 'use-debounce';
import {useState} from 'react';
import type {PostsListParams, PostsResource} from '../posts-query-params';

interface FilterOption {
    name: string;
    value: string | null;
}

const POST_TYPE_OPTIONS: FilterOption[] = [
    {name: 'All posts', value: null},
    {name: 'Draft posts', value: 'draft'},
    {name: 'Published posts', value: 'published'},
    {name: 'Email only posts', value: 'sent'},
    {name: 'Scheduled posts', value: 'scheduled'},
    {name: 'Featured posts', value: 'featured'}
];

const PAGE_TYPE_OPTIONS: FilterOption[] = [
    {name: 'All pages', value: null},
    {name: 'Draft pages', value: 'draft'},
    {name: 'Published pages', value: 'published'},
    {name: 'Scheduled pages', value: 'scheduled'},
    {name: 'Featured pages', value: 'featured'}
];

const VISIBILITY_OPTIONS: FilterOption[] = [
    {name: 'All access', value: null},
    {name: 'Public', value: 'public'},
    {name: 'Members-only', value: 'members'},
    {name: 'Paid members-only', value: '[paid,tiers]'}
];

const ORDER_OPTIONS: FilterOption[] = [
    {name: 'Newest first', value: null},
    {name: 'Oldest first', value: 'published_at asc'},
    {name: 'Recently updated', value: 'updated_at desc'}
];

function FilterDropdown({ariaLabel, options, selectedValue, onSelect}: {
    ariaLabel: string;
    options: FilterOption[];
    selectedValue: string | null;
    onSelect: (value: string | null) => void;
}) {
    const selectedOption = options.find(option => option.value === selectedValue);
    const triggerLabel = selectedOption?.name ?? selectedValue ?? options[0]?.name;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label={ariaLabel} variant="outline">
                    {triggerLabel}
                    <LucideIcon.ChevronDown className="size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                {options.map(option => (
                    <DropdownMenuItem
                        key={option.value ?? 'all'}
                        aria-selected={option.value === selectedValue}
                        role="option"
                        onSelect={() => onSelect(option.value)}
                    >
                        {option.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * The tag filter searches server-side (Ember parity: tagsManager
 * searchTagsTask) so sites with more than 100 tags can still filter by any
 * tag — the default browse query only returns the first 100.
 */
function TagFilterDropdown({selectedValue, enabled, onSelect}: {
    selectedValue: string | null;
    enabled: boolean;
    onSelect: (value: string | null) => void;
}) {
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search.trim(), 300);
    // Mirrors Ember's tagsManager.searchTagsTask filter, including the quote escaping
    const safeTerm = debouncedSearch.replace(/'/g, '\\\'');
    const {data: tagsData} = useBrowseTags({
        filter: {visibility: '[public,internal]'},
        searchParams: debouncedSearch ? {filter: `tags.name:~'${safeTerm}'`} : undefined,
        enabled
    });

    const options: FilterOption[] = [
        {name: 'All tags', value: null},
        ...(tagsData?.tags ?? []).map(tag => ({name: tag.name, value: tag.slug}))
    ];
    const selectedOption = options.find(option => option.value === selectedValue);
    const triggerLabel = selectedOption?.name ?? selectedValue ?? options[0]?.name;

    return (
        <DropdownMenu onOpenChange={(open) => {
            if (!open) {
                setSearch('');
            }
        }}>
            <DropdownMenuTrigger asChild>
                <Button aria-label="Tag filter" variant="outline">
                    {triggerLabel}
                    <LucideIcon.ChevronDown className="size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                <input
                    aria-label="Search tags"
                    className="mb-1 w-full rounded-sm border bg-transparent px-2 py-1.5 text-sm outline-hidden focus:border-foreground/30"
                    placeholder="Search tags..."
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    // Keep typing from triggering the menu's typeahead/navigation
                    onKeyDown={event => event.stopPropagation()}
                />
                {options.map(option => (
                    <DropdownMenuItem
                        key={option.value ?? 'all'}
                        aria-selected={option.value === selectedValue}
                        role="option"
                        onSelect={() => onSelect(option.value)}
                    >
                        {option.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface PostsFiltersProps {
    resource: PostsResource;
    params: PostsListParams;
    /** Authors and contributors only see their own content and lose the audience filters */
    restricted: boolean;
    onParamChange: (key: 'type' | 'visibility' | 'author' | 'tag' | 'order', value: string | null) => void;
}

function PostsFilters({resource, params, restricted, onParamChange}: PostsFiltersProps) {
    const {data: usersData} = useBrowseUsers({
        searchParams: {limit: 'all', include: 'roles'},
        enabled: !restricted
    });

    const authorOptions: FilterOption[] = [
        {name: 'All authors', value: null},
        ...(usersData?.users ?? []).map(user => ({name: user.name, value: user.slug}))
    ];

    return (
        <div className="flex flex-wrap items-center gap-2" data-testid="posts-filters">
            <FilterDropdown
                ariaLabel="Type filter"
                options={resource === 'pages' ? PAGE_TYPE_OPTIONS : POST_TYPE_OPTIONS}
                selectedValue={params.type}
                onSelect={value => onParamChange('type', value)}
            />
            {!restricted && (
                <>
                    <FilterDropdown
                        ariaLabel="Visibility filter"
                        options={VISIBILITY_OPTIONS}
                        selectedValue={params.visibility}
                        onSelect={value => onParamChange('visibility', value)}
                    />
                    <FilterDropdown
                        ariaLabel="Author filter"
                        options={authorOptions}
                        selectedValue={params.author}
                        onSelect={value => onParamChange('author', value)}
                    />
                    <TagFilterDropdown
                        enabled={!restricted}
                        selectedValue={params.tag}
                        onSelect={value => onParamChange('tag', value)}
                    />
                </>
            )}
            <FilterDropdown
                ariaLabel="Sort filter"
                options={ORDER_OPTIONS}
                selectedValue={params.order}
                onSelect={value => onParamChange('order', value)}
            />
        </div>
    );
}

export default PostsFilters;
