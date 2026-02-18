import MainLayout from '@components/layout/main-layout';
import React, {useMemo, useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyIndicator, LoadingIndicator, LucideIcon, cn} from '@tryghost/shade';
import {CalendarDay, CalendarMonth, CalendarPostOrder, CalendarPostStatus, CalendarTypeFilter, buildCalendarGrid, formatMonthLabel, getCalendarDateRangeFilter, getLegendStatusesForType, getNowMonthInTimezone, shiftCalendarMonth} from './utils/calendar';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {isAuthorOrContributor, isContributorUser, useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useSearchParams} from '@tryghost/admin-x-framework';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_POSTS_PER_DAY = 3;
const DEFAULT_TYPE_VALUE: CalendarTypeFilter = 'scheduled';
const ALL_FILTER_VALUE = '__all__';
const DEFAULT_ORDER_VALUE = '__default_order__';
const FILTER_QUERY_PARAMS = ['type', 'visibility', 'author', 'tag', 'order'] as const;

type CalendarVisibilityFilter = 'public' | 'members' | '[paid,tiers]' | null;
type CalendarOrderFilter = 'published_at asc' | 'updated_at desc' | null;
type CalendarQueryParam = typeof FILTER_QUERY_PARAMS[number];
type FilterOption = {label: string; value: string};

// TODO: Replace LegacyFilterSelect with a Shade Select once the legacy admin UI is retired.
// The ember-* classes (for example 'ember-view' and 'ember-basic-dropdown-trigger') are
// intentionally preserved for visual parity with current admin filter controls.
/**
 * Dropdown wrapper that mimics legacy Ghost filter select styling and behavior.
 */
const LegacyFilterSelect = ({
    value,
    options,
    onValueChange,
    ariaLabel,
    disabled
}: {
    value: string;
    options: FilterOption[];
    onValueChange: (nextValue: string) => void;
    ariaLabel: string;
    disabled?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(option => option.value === value);

    return (
        <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger disabled={disabled} asChild>
                <div
                    aria-label={ariaLabel}
                    className={cn(
                        'ember-view ember-basic-dropdown-trigger ember-power-select-trigger gh-contentfilter-menu-trigger',
                        isOpen && 'gh-contentfilter-menu-trigger--active',
                        disabled && 'pointer-events-none opacity-60'
                    )}
                    role="button"
                    tabIndex={0}
                >
                    <span className="ember-power-select-selected-item">
                        {selectedOption?.label ?? ''}
                    </span>
                    <svg viewBox="0 0 26 17">
                        <title>arrow-down-small</title>
                        <path d="M1.469 2.18l11.5 13.143 11.5-13.143" fill="none" stroke="#0B0B0A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                    </svg>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gh-contentfilter-menu-dropdown p-0" sideOffset={6}>
                {options.map((option) => {
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            className={cn(
                                'ember-power-select-option rounded-[3px] px-[10px] py-[7px] text-[1.3rem]',
                                option.value === value && 'ember-power-select-option--selected'
                            )}
                            onSelect={() => onValueChange(option.value)}
                        >
                            {option.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const TYPE_OPTIONS: Array<{label: string; value: CalendarTypeFilter}> = [
    {label: 'All posts', value: 'all'},
    {label: 'Draft posts', value: 'draft'},
    {label: 'Published posts', value: 'published'},
    {label: 'Scheduled posts', value: 'scheduled'},
    {label: 'Featured posts', value: 'featured'}
];

const VISIBILITY_OPTIONS: Array<{label: string; value: Exclude<CalendarVisibilityFilter, null>}> = [
    {label: 'Public', value: 'public'},
    {label: 'Members-only', value: 'members'},
    {label: 'Paid members-only', value: '[paid,tiers]'}
];

const ORDER_OPTIONS: Array<{label: string; value: Exclude<CalendarOrderFilter, null>}> = [
    {label: 'Oldest first', value: 'published_at asc'},
    {label: 'Recently updated', value: 'updated_at desc'}
];

/**
 * Checks whether a URL value maps to a supported calendar type filter.
 */
const isCalendarTypeFilter = (value: string | null): value is CalendarTypeFilter => {
    return Boolean(value && TYPE_OPTIONS.some(option => option.value === value));
};

/**
 * Checks whether a URL value maps to a supported visibility filter.
 */
const isCalendarVisibilityFilter = (value: string | null): value is Exclude<CalendarVisibilityFilter, null> => {
    return Boolean(value && VISIBILITY_OPTIONS.some(option => option.value === value));
};

/**
 * Checks whether a URL value maps to a supported explicit sort order.
 */
const isCalendarOrderFilter = (value: string | null): value is Exclude<CalendarOrderFilter, null> => {
    return Boolean(value && ORDER_OPTIONS.some(option => option.value === value));
};

/**
 * Converts the selected type UI value into the status NQL clause.
 */
const getStatusFilterForType = (type: CalendarTypeFilter): string => {
    switch (type) {
    case 'draft':
        return 'draft';
    case 'published':
        return 'published';
    case 'scheduled':
        return 'scheduled';
    default:
        return '[draft,scheduled,published]';
    }
};

/**
 * Builds the base NQL filter for the calendar from the current UI selections.
 */
const buildCalendarFilter = ({
    type,
    visibility,
    tag,
    author,
    currentUserSlug,
    shouldForceCurrentUser
}: {
    type: CalendarTypeFilter;
    visibility: CalendarVisibilityFilter;
    tag: string | null;
    author: string | null;
    currentUserSlug: string | null;
    shouldForceCurrentUser: boolean;
}) => {
    const parts = [`status:${getStatusFilterForType(type)}`];

    if (type === 'featured') {
        parts.push('featured:true');
    }

    if (visibility) {
        parts.push(`visibility:${visibility}`);
    }

    if (tag) {
        parts.push(`tag:${tag}`);
    }

    if (shouldForceCurrentUser && currentUserSlug) {
        parts.push(`authors:${currentUserSlug}`);
    } else if (author) {
        parts.push(`authors:${author}`);
    }

    return parts.join('+');
};

const POST_STATUS_STYLES: Record<CalendarPostStatus, {
    label: string;
    itemClass: string;
    badgeClass: string;
}> = {
    published: {
        label: 'Published',
        itemClass: 'border-zinc-300 text-zinc-800 bg-gray/30 text-gray hover:border-black/30',
        badgeClass: 'border-zinc-300 text-zinc-700 bg-gray/30 text-gray'
    },
    scheduled: {
        label: 'Scheduled',
        itemClass: 'border-green/30 bg-green/10 text-green hover:border-green/60',
        badgeClass: 'border-green/30 bg-green/10 text-green'
    },
    draft: {
        label: 'Draft',
        itemClass: 'border-amber-200 bg-amber-50/80 text-amber-900 hover:border-black/30',
        badgeClass: 'border-amber-300 bg-amber-100 text-amber-800'
    },
    unknown: {
        label: 'Other',
        itemClass: 'border-border bg-background text-foreground hover:border-foreground/30',
        badgeClass: 'border-border bg-muted text-muted-foreground'
    }
};

interface MonthNavigationProps {
    monthLabel: string;
    monthOffset: number;
    setMonthOffset: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Month navigation controls for previous/current/next calendar views.
 */
const MonthNavigation: React.FC<MonthNavigationProps> = ({monthLabel, monthOffset, setMonthOffset}) => {
    return (
        <div className="flex items-center gap-2">
            <Button
                aria-label="Show previous month"
                variant="outline"
                onClick={() => setMonthOffset(offset => offset - 1)}
            >
                <LucideIcon.ChevronLeft className="size-4" />
            </Button>
            <Button
                disabled={monthOffset === 0}
                variant="outline"
                onClick={() => setMonthOffset(0)}
            >
                Today
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium text-muted-foreground">
                {monthLabel}
            </span>
            <Button
                aria-label="Show next month"
                variant="outline"
                onClick={() => setMonthOffset(offset => offset + 1)}
            >
                <LucideIcon.ChevronRight className="size-4" />
            </Button>
        </div>
    );
};

interface FilterBarProps {
    authorOptions: FilterOption[];
    tagOptions: FilterOption[];
    legendStatuses: CalendarPostStatus[];
    hasActiveFilters: boolean;
    selectedType: CalendarTypeFilter;
    selectedVisibility: CalendarVisibilityFilter;
    selectedAuthor: string | null;
    selectedTag: string | null;
    selectedOrder: CalendarOrderFilter;
    setFilterParam: (key: CalendarQueryParam, value: string | null) => void;
    clearFilters: () => void;
    isCurrentUserContributor: boolean;
    isCurrentUserAuthorOrContributor: boolean;
    isAuthorsLoading: boolean;
    isTagsLoading: boolean;
}

/**
 * Calendar filter row with type, visibility, author, tag, and ordering controls.
 */
const FilterBar: React.FC<FilterBarProps> = ({
    authorOptions,
    tagOptions,
    legendStatuses,
    hasActiveFilters,
    selectedType,
    selectedVisibility,
    selectedAuthor,
    selectedTag,
    selectedOrder,
    setFilterParam,
    clearFilters,
    isCurrentUserContributor,
    isCurrentUserAuthorOrContributor,
    isAuthorsLoading,
    isTagsLoading
}) => {
    const hasActiveTypeFilter = selectedType !== DEFAULT_TYPE_VALUE && selectedType !== 'all';

    return (
        <div
            className="gh-contentfilter view-actions-bottom-row"
            data-can-clear={Boolean(clearFilters)}
            data-has-active-filters={hasActiveFilters}
            data-legend-count={legendStatuses.length}
        >
            <div className={cn('gh-contentfilter-menu gh-contentfilter-type', hasActiveTypeFilter && 'gh-contentfilter-selected')}>
                <LegacyFilterSelect
                    ariaLabel="Type filter"
                    options={TYPE_OPTIONS}
                    value={selectedType}
                    onValueChange={(value) => {
                        setFilterParam('type', value === DEFAULT_TYPE_VALUE ? null : value);
                    }}
                />
            </div>
            {!isCurrentUserContributor && (
                <div className={cn('gh-contentfilter-menu gh-contentfilter-visibility', selectedVisibility && 'gh-contentfilter-selected')}>
                    <LegacyFilterSelect
                        ariaLabel="Visibility filter"
                        options={[
                            {label: 'All access', value: ALL_FILTER_VALUE},
                            ...VISIBILITY_OPTIONS
                        ]}
                        value={selectedVisibility ?? ALL_FILTER_VALUE}
                        onValueChange={(value) => {
                            setFilterParam('visibility', value === ALL_FILTER_VALUE ? null : value);
                        }}
                    />
                </div>
            )}
            {!isCurrentUserAuthorOrContributor && (
                <div className={cn('gh-contentfilter-menu gh-contentfilter-author', selectedAuthor && 'gh-contentfilter-selected')}>
                    <LegacyFilterSelect
                        ariaLabel="Author filter"
                        disabled={isAuthorsLoading}
                        options={authorOptions}
                        value={selectedAuthor ?? ALL_FILTER_VALUE}
                        onValueChange={(value) => {
                            setFilterParam('author', value === ALL_FILTER_VALUE ? null : value);
                        }}
                    />
                </div>
            )}
            {!isCurrentUserContributor && (
                <div className={cn('gh-contentfilter-menu gh-contentfilter-tag', selectedTag && 'gh-contentfilter-selected')}>
                    <LegacyFilterSelect
                        ariaLabel="Tag filter"
                        disabled={isTagsLoading}
                        options={tagOptions}
                        value={selectedTag ?? ALL_FILTER_VALUE}
                        onValueChange={(value) => {
                            setFilterParam('tag', value === ALL_FILTER_VALUE ? null : value);
                        }}
                    />
                </div>
            )}
            <div className={cn('gh-contentfilter-menu gh-contentfilter-sort', selectedOrder && 'gh-contentfilter-selected')}>
                <LegacyFilterSelect
                    ariaLabel="Sort filter"
                    options={[
                        {label: 'Newest first', value: DEFAULT_ORDER_VALUE},
                        ...ORDER_OPTIONS
                    ]}
                    value={selectedOrder ?? DEFAULT_ORDER_VALUE}
                    onValueChange={(value) => {
                        setFilterParam('order', value === DEFAULT_ORDER_VALUE ? null : value);
                    }}
                />
            </div>
        </div>
    );
};

interface CalendarGridProps {
    calendarDays: CalendarDay[];
    siteTimezone: string;
    month: CalendarMonth;
    calendarOrder: CalendarPostOrder;
    posts: Post[];
}

/**
 * 7-column calendar grid that renders per-day post cards and overflow counts.
 */
const CalendarGrid: React.FC<CalendarGridProps> = ({calendarDays, siteTimezone, month, calendarOrder, posts}) => {
    return (
        <div
            className="overflow-x-auto pb-2"
            data-calendar-month={`${month.year}-${month.month}`}
            data-calendar-order={calendarOrder}
            data-post-count={posts.length}
            data-site-timezone={siteTimezone}
        >
            <div className="min-w-[960px]">
                <div className="mb-2 grid grid-cols-7 gap-2">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="rounded-md px-2 py-1 text-xs font-medium uppercase text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day) => {
                        const visiblePosts = day.posts.slice(0, MAX_POSTS_PER_DAY);
                        const hiddenPostCount = day.posts.length - visiblePosts.length;

                        return (
                            <div
                                key={day.dateKey}
                                className={cn(
                                    'min-h-[180px] rounded-xl border border-border bg-card p-2',
                                    !day.inCurrentMonth && 'bg-muted/35 text-muted-foreground'
                                )}
                            >
                                <div className="text-sm font-medium">{day.dayNumber}</div>
                                {visiblePosts.length > 0 && (
                                    <ul className="mt-2 space-y-1.5">
                                        {visiblePosts.map((post) => {
                                            const style = POST_STATUS_STYLES[post.status] ?? POST_STATUS_STYLES.unknown;

                                            return (
                                                <li key={post.id}>
                                                    <a
                                                        className={cn('block rounded-md border px-2 py-1.5 text-xs', style.itemClass)}
                                                        href={`#/editor/post/${post.id}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="line-clamp-2 font-medium">{post.title || 'Untitled post'}</span>
                                                        </div>
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {hiddenPostCount > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        +{hiddenPostCount} more
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/**
 * Posts app calendar view with URL-synced filters and role-aware defaults.
 */
const ContentCalendar: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const settings = useBrowseSettings();
    const currentUserQuery = useCurrentUser();
    const currentUser = currentUserQuery.data;
    const siteTimezone = useMemo(() => getSiteTimezone(settings.data?.settings ?? []), [settings.data?.settings]);
    const [monthOffset, setMonthOffset] = useState(0);
    const month = useMemo(() => shiftCalendarMonth(getNowMonthInTimezone(siteTimezone), monthOffset), [siteTimezone, monthOffset]);
    const monthLabel = useMemo(() => formatMonthLabel(month), [month]);
    const selectedTypeParam = searchParams.get('type');
    const selectedVisibilityParam = searchParams.get('visibility');
    const selectedOrderParam = searchParams.get('order');
    const selectedType: CalendarTypeFilter = isCalendarTypeFilter(selectedTypeParam) ? selectedTypeParam : DEFAULT_TYPE_VALUE;
    const selectedVisibility: CalendarVisibilityFilter = isCalendarVisibilityFilter(selectedVisibilityParam) ? selectedVisibilityParam : null;
    const selectedAuthor = searchParams.get('author');
    const selectedTag = searchParams.get('tag');
    const selectedOrder: CalendarOrderFilter = isCalendarOrderFilter(selectedOrderParam) ? selectedOrderParam : null;
    const isCurrentUserContributor = currentUser ? isContributorUser(currentUser) : false;
    const isCurrentUserAuthorOrContributor = currentUser ? isAuthorOrContributor(currentUser) : false;
    const defaultOrder: CalendarPostOrder = selectedType === 'draft' ? 'updated_at desc' : 'published_at desc';
    const calendarOrder: CalendarPostOrder = selectedOrder ?? defaultOrder;
    const dateRangeFilter = useMemo(() => getCalendarDateRangeFilter(month), [month]);
    const calendarFilter = useMemo(() => buildCalendarFilter({
        type: selectedType,
        visibility: selectedVisibility,
        tag: selectedTag,
        author: selectedAuthor,
        currentUserSlug: currentUser?.slug ?? null,
        shouldForceCurrentUser: isCurrentUserAuthorOrContributor
    }), [selectedType, selectedVisibility, selectedTag, selectedAuthor, currentUser?.slug, isCurrentUserAuthorOrContributor]);
    const postQueryFilter = useMemo(() => {
        return `${calendarFilter}+${dateRangeFilter}`;
    }, [calendarFilter, dateRangeFilter]);
    const authorsQuery = useBrowseUsers({
        enabled: !isCurrentUserAuthorOrContributor,
        searchParams: {
            limit: 'all',
            include: 'roles'
        }
    });
    const tagsQuery = useBrowseTags({
        enabled: !isCurrentUserContributor,
        filter: {
            visibility: '[public,internal]'
        },
        searchParams: {
            limit: 'all',
            order: 'name asc'
        }
    });
    const authorOptions = useMemo(() => {
        const options = [{
            label: 'All authors',
            value: ALL_FILTER_VALUE
        }];
        const authors = [...(authorsQuery.data?.users ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(author => ({
                label: author.name,
                value: author.slug
            }));
        options.push(...authors);

        if (selectedAuthor && !options.some(option => option.value === selectedAuthor)) {
            options.push({
                label: selectedAuthor,
                value: selectedAuthor
            });
        }

        return options;
    }, [authorsQuery.data?.users, selectedAuthor]);
    const tagOptions = useMemo(() => {
        const options = [{
            label: 'All tags',
            value: ALL_FILTER_VALUE
        }];
        const tags = [...(tagsQuery.data?.tags ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(tag => ({
                label: tag.name,
                value: tag.slug
            }));
        options.push(...tags);

        if (selectedTag && !options.some(option => option.value === selectedTag)) {
            options.push({
                label: selectedTag,
                value: selectedTag
            });
        }

        return options;
    }, [tagsQuery.data?.tags, selectedTag]);
    const legendStatuses = useMemo(() => getLegendStatusesForType(selectedType), [selectedType]);
    const hasActiveTypeFilter = selectedType !== DEFAULT_TYPE_VALUE && selectedType !== 'all';
    const hasActiveFilters = hasActiveTypeFilter || Boolean(selectedVisibility) || Boolean(selectedAuthor) || Boolean(selectedTag) || Boolean(selectedOrder);

    /**
     * Writes a single calendar filter value to URL search params.
     */
    const setFilterParam = (key: CalendarQueryParam, value: string | null) => {
        const nextSearchParams = new URLSearchParams(searchParams);

        if (value) {
            nextSearchParams.set(key, value);
        } else {
            nextSearchParams.delete(key);
        }

        setSearchParams(nextSearchParams, {replace: true});
    };

    /**
     * Clears all calendar filter query params and resets type to "all".
     */
    const clearFilters = () => {
        const nextSearchParams = new URLSearchParams(searchParams);

        FILTER_QUERY_PARAMS.forEach((key) => {
            nextSearchParams.delete(key);
        });
        nextSearchParams.set('type', 'all');

        setSearchParams(nextSearchParams, {replace: true});
    };

    const {data, isError, isLoading} = useBrowsePosts({
        searchParams: {
            filter: postQueryFilter,
            limit: 'all',
            order: calendarOrder
        }
    });

    const posts = useMemo(() => data?.posts ?? [], [data?.posts]);
    const calendarDays = useMemo(() => buildCalendarGrid({
        month,
        posts,
        timeZone: siteTimezone,
        order: calendarOrder
    }), [month, posts, siteTimezone, calendarOrder]);

    return (
        <MainLayout>
            <div className="grid w-full grow">
                <section className="gh-canvas gh-canvas-sticky flex h-full flex-col" data-testid="content-calendar-page">
                    <header className="gh-canvas-header break tablet post-header sticky">
                        <div className="gh-canvas-header-content">
                            <div className="gh-canvas-title-container">
                                <div className="gh-canvas-breadcrumb">
                                    <a href="#/posts/">Posts</a>
                                    <LucideIcon.ChevronRight className="size-3 text-muted-foreground" />
                                    Calendar
                                </div>
                                <h2 className="gh-canvas-title gh-post-title" data-test-screen-title>
                                    Calendar
                                </h2>
                            </div>

                            <section className="view-actions" data-testid="calendar-filters">
                                <FilterBar
                                    authorOptions={authorOptions}
                                    clearFilters={clearFilters}
                                    hasActiveFilters={hasActiveFilters}
                                    isAuthorsLoading={authorsQuery.isLoading}
                                    isCurrentUserAuthorOrContributor={isCurrentUserAuthorOrContributor}
                                    isCurrentUserContributor={isCurrentUserContributor}
                                    isTagsLoading={tagsQuery.isLoading}
                                    legendStatuses={legendStatuses}
                                    selectedAuthor={selectedAuthor}
                                    selectedOrder={selectedOrder}
                                    selectedTag={selectedTag}
                                    selectedType={selectedType}
                                    selectedVisibility={selectedVisibility}
                                    setFilterParam={setFilterParam}
                                    tagOptions={tagOptions}
                                />
                                <div className="view-actions-top-row">
                                    <Button asChild>
                                        <a href="#/editor/post">New post</a>
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </header>
                    <section className="view-container content-list px-4 pb-8 lg:px-8">
                        {isLoading ? (
                            <div className="flex min-h-[400px] items-center justify-center">
                                <LoadingIndicator size="lg" />
                            </div>
                        ) : isError ? (
                            <div className="mb-16 flex min-h-[400px] flex-col items-center justify-center">
                                <h2 className="mb-2 text-xl font-medium">Error loading calendar</h2>
                                <p className="mb-4 text-muted-foreground">Please reload the page to try again.</p>
                                <Button onClick={() => window.location.reload()}>
                                    Reload page
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    {posts.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {legendStatuses.map((status) => {
                                                const style = POST_STATUS_STYLES[status];

                                                return (
                                                    <span
                                                        key={status}
                                                        className={cn('inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium', style.badgeClass)}
                                                    >
                                                        {style.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <MonthNavigation monthLabel={monthLabel} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />
                                </div>
                                {posts.length === 0 ? (
                                    <div className="flex min-h-[400px] items-center justify-center">
                                        <EmptyIndicator
                                            actions={hasActiveFilters ? (
                                                <Button variant="outline" onClick={clearFilters}>
                                                    Show all posts
                                                </Button>
                                            ) : (
                                                <Button asChild>
                                                    <a href="#/editor/post">Create a post</a>
                                                </Button>
                                            )}
                                            title={hasActiveFilters ? 'No posts match the current filter' : 'No posts to display yet'}
                                        >
                                            <LucideIcon.CalendarDays />
                                        </EmptyIndicator>
                                    </div>
                                ) : (
                                    <CalendarGrid
                                        calendarDays={calendarDays}
                                        calendarOrder={calendarOrder}
                                        month={month}
                                        posts={posts}
                                        siteTimezone={siteTimezone}
                                    />
                                )}
                            </>
                        )}
                    </section>
                </section>
            </div>
        </MainLayout>
    );
};

export default ContentCalendar;
