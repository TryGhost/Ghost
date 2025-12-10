import APAvatar from '@components/global/ap-avatar';
import ActivityItem from '@components/activities/activity-item';
import FollowButton from '@components/global/follow-button';
import ProfilePreviewHoverCard from '../global/profile-preview-hover-card';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, Input, LoadingIndicator, LucideIcon, NoValueLabel, NoValueLabelIcon} from '@tryghost/shade';
import {SuggestedProfiles} from '../global/suggested-profiles';
import {useAccountForUser, useSearchForUser, useSuggestedProfilesForUser, useTopicsForUser} from '@hooks/use-activity-pub-queries';
import {useDebounce} from 'use-debounce';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

interface AccountSearchResult {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    followedByMe: boolean;
    blockedByMe: boolean;
    domainBlockedByMe: boolean;
}

interface TopicSearchResult {
    slug: string;
    name: string;
}

type SearchResult =
    | {type: 'topic'; data: TopicSearchResult}
    | {type: 'account'; data: AccountSearchResult};

interface SearchProps {
    onOpenChange?: (open: boolean) => void;
    query: string;
    setQuery: (query: string) => void;
}

const STICKY_HEADER_HEIGHT = 80;

const Search: React.FC<SearchProps> = ({onOpenChange, query, setQuery}) => {
    const queryInputRef = useRef<HTMLInputElement>(null);
    const selectedItemRef = useRef<HTMLDivElement>(null);
    const lastKeyPressRef = useRef(0);

    const navigate = useNavigateWithBasePath();
    const [debouncedQuery] = useDebounce(query, 300);

    const shouldSearch = query.length >= 2;

    const {searchQuery, updateAccountSearchResult: updateResult} = useSearchForUser('index', shouldSearch ? debouncedQuery : '');
    const {data, isFetching, isFetched} = searchQuery;

    const {suggestedProfilesQuery} = useSuggestedProfilesForUser('index', 5);
    const {data: suggestedProfilesData, isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;

    const hasSuggestedProfiles = isLoadingSuggestedProfiles || (suggestedProfilesData && suggestedProfilesData.length > 0);

    const {topicsQuery} = useTopicsForUser();
    const {data: topicsData} = topicsQuery;

    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = currentAccountQuery;

    const [displayResults, setDisplayResults] = useState<AccountSearchResult[]>([]);
    const [lastResultState, setLastResultState] = useState<'results' | 'none' | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Filter topics client-side
    const matchingTopics = useMemo(() => {
        const topics = topicsData?.topics || [];

        if (!shouldSearch || topics.length === 0) {
            return [];
        }

        const normalizedQuery = query.toLowerCase();

        return topics.filter((topic) => {
            if (topic.slug === 'following') {
                return false;
            }

            return topic.name.toLowerCase().startsWith(normalizedQuery) ||
                   topic.slug.toLowerCase().startsWith(normalizedQuery);
        });
    }, [query, shouldSearch, topicsData?.topics]);

    // Merge topics and accounts into a single list
    const searchResults: SearchResult[] = useMemo(() => [
        ...matchingTopics.map(topic => ({type: 'topic' as const, data: topic})),
        ...displayResults.map(account => ({type: 'account' as const, data: account}))
    ], [matchingTopics, displayResults]);

    useEffect(() => {
        if (!shouldSearch) {
            setDisplayResults([]);
            setLastResultState(null);
            return;
        }

        if (!isFetched) {
            return;
        }

        if (data?.accounts && data.accounts.length > 0) {
            setDisplayResults(data.accounts);
            setLastResultState('results');
            setSelectedIndex(0);
        } else {
            setDisplayResults([]);
            setLastResultState('none');
            setSelectedIndex(0);
        }
    }, [data?.accounts, isFetched, shouldSearch]);

    const showLoading = isFetching && shouldSearch;
    const showSuggested = query.length < 2 || (!lastResultState && shouldSearch && matchingTopics.length === 0);
    const showNoResults = !showSuggested && lastResultState === 'none' && matchingTopics.length === 0;
    const showSearchResults = !showSuggested && (displayResults.length > 0 || matchingTopics.length > 0);

    // Focus input on mount
    useEffect(() => {
        queryInputRef.current?.focus();
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        const element = selectedItemRef.current;
        if (!element) {
            return;
        }

        const container = element.closest('[data-radix-scroll-area-viewport]') || element.closest('.overflow-y-auto');
        if (!container) {
            element.scrollIntoView({block: 'nearest'});

            return;
        }

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (elementRect.top < containerRect.top + STICKY_HEADER_HEIGHT) {
            container.scrollTo({
                top: container.scrollTop - (containerRect.top + STICKY_HEADER_HEIGHT - elementRect.top),
                behavior: 'smooth'
            });
        } else if (elementRect.bottom > containerRect.bottom - STICKY_HEADER_HEIGHT) {
            container.scrollTo({
                top: container.scrollTop + (elementRect.bottom - containerRect.bottom + STICKY_HEADER_HEIGHT),
                behavior: 'smooth'
            });
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSearchResults) {
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            // Throttle rapid key presses
            const now = Date.now();
            if (now - lastKeyPressRef.current < 50) {
                return;
            }
            lastKeyPressRef.current = now;

            if (e.key === 'ArrowDown') {
                setSelectedIndex(prev => (prev + 1) % searchResults.length);
            } else {
                setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();

            const item = searchResults[selectedIndex];

            onOpenChange?.(false);

            if (item.type === 'topic') {
                navigate(`/explore/${item.data.slug}`);
            } else {
                navigate(`/profile/${item.data.handle}`);
            }
        }
    };

    return (
        <>
            <div className='sticky -top-6 z-30 -mt-6 flex h-[72px] shrink-0 items-center gap-2 bg-white pb-2 pt-3 before:pointer-events-none before:absolute before:-inset-x-6 before:bottom-0 before:h-0 before:border-b before:border-b-gray-150 before:content-[""] dark:bg-[#101114] dark:before:border-b-gray-950'>
                <LucideIcon.Search className='text-gray-600' size={18} strokeWidth={1.5} />
                <Input
                    ref={queryInputRef}
                    autoComplete='off'
                    className='flex h-10 w-full items-center rounded-lg border-0 bg-transparent px-0 py-1.5 text-lg focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-0 dark:bg-[#101114] dark:text-white dark:placeholder:text-gray-800'
                    placeholder='Search by name, handle, or URL...'
                    title="Search"
                    type='text'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {showLoading && (
                    <LoadingIndicator className='!absolute right-0 mr-0.5 shrink-0' size='sm' />
                )}
            </div>
            <div className='h-full'>
                {showNoResults && (
                    <div className='flex h-full items-center justify-center pb-14'>
                        <NoValueLabel>
                            <NoValueLabelIcon><LucideIcon.UserRound /></NoValueLabelIcon>
                            No users matching this handle or account URL
                        </NoValueLabel>
                    </div>
                )}
                {showSearchResults && (
                    <div className='mt-[-14px] pb-2'>
                        {searchResults.map((item, index) => {
                            const isSelected = index === selectedIndex;

                            if (item.type === 'topic') {
                                return (
                                    <div
                                        key={item.data.slug}
                                        ref={isSelected ? selectedItemRef : undefined}
                                    >
                                        <ActivityItem
                                            isSelected={isSelected}
                                            onClick={() => {
                                                onOpenChange?.(false);
                                                navigate(`/explore/${item.data.slug}`);
                                            }}
                                        >
                                            <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900'>
                                                <LucideIcon.Globe className='text-gray-700 dark:text-gray-500' size={18} strokeWidth={1.5} />
                                            </div>
                                            <div className='flex flex-col'>
                                                <span className='font-semibold text-black dark:text-white'>{item.data.name}</span>
                                                <span className='text-sm text-gray-700 dark:text-gray-600'>Topic</span>
                                            </div>
                                        </ActivityItem>
                                    </div>
                                );
                            }

                            const account = item.data;
                            const isCurrentUser = account.handle === currentUser?.handle;

                            return (
                                <ProfilePreviewHoverCard
                                    key={account.id}
                                    actor={account as unknown as ActorProperties}
                                    align='center'
                                    isCurrentUser={isCurrentUser}
                                    side='left'
                                >
                                    <div ref={isSelected ? selectedItemRef : undefined}>
                                        <ActivityItem
                                            isSelected={isSelected}
                                            onClick={() => {
                                                onOpenChange?.(false);
                                                navigate(`/profile/${account.handle}`);
                                            }}
                                        >
                                            <APAvatar author={{
                                                icon: {url: account.avatarUrl},
                                                name: account.name,
                                                handle: account.handle
                                            }}/>
                                            <div className='flex flex-col break-anywhere'>
                                                <span className='line-clamp-1 font-semibold text-black dark:text-white'>{account.name}</span>
                                                <span className='line-clamp-1 text-sm text-gray-700 dark:text-gray-600'>{account.handle}</span>
                                            </div>
                                            {account.blockedByMe || account.domainBlockedByMe ? (
                                                <Button className='pointer-events-none ml-auto min-w-[90px]' variant='destructive'>Blocked</Button>
                                            ) : !isCurrentUser ? (
                                                <FollowButton
                                                    className='ml-auto'
                                                    following={account.followedByMe}
                                                    handle={account.handle}
                                                    type='secondary'
                                                    onFollow={() => updateResult(account.id, {followedByMe: true})}
                                                    onUnfollow={() => updateResult(account.id, {followedByMe: false})}
                                                />
                                            ) : null}
                                        </ActivityItem>
                                    </div>
                                </ProfilePreviewHoverCard>
                            );
                        })}
                    </div>
                )}
                {showSuggested && hasSuggestedProfiles && (
                    <>
                        <H4>More people to follow</H4>
                        <SuggestedProfiles
                            onOpenChange={onOpenChange}
                        />
                    </>
                )}
            </div>
        </>
    );
};

export default Search;
