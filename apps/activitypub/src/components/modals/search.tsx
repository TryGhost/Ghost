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

interface AccountSearchResultItemProps {
    account: AccountSearchResult;
    update: (id: string, updated: Partial<AccountSearchResult>) => void;
}

const AccountSearchResultItem: React.FC<AccountSearchResultItemProps & {
    onOpenChange?: (open: boolean) => void;
    isSelected?: boolean;
    onRefSet?: (ref: HTMLDivElement | null) => void;
}> = ({account, update, onOpenChange, isSelected = false, onRefSet}) => {
    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = currentAccountQuery;
    const isCurrentUser = account.handle === currentUser?.handle;

    const onFollow = () => {
        update(account.id, {
            followedByMe: true
        });
    };

    const onUnfollow = () => {
        update(account.id, {
            followedByMe: false
        });
    };

    const navigate = useNavigateWithBasePath();

    return (
        <ProfilePreviewHoverCard actor={account as unknown as ActorProperties} align='center' isCurrentUser={isCurrentUser} side='left'>
            <div ref={onRefSet}>
                <ActivityItem
                    key={account.id}
                    isSelected={isSelected}
                    onClick={() => {
                        onOpenChange?.(false);
                        navigate(`/profile/${account.handle}`);
                    }}
                >
                    <APAvatar author={{
                        icon: {
                            url: account.avatarUrl
                        },
                        name: account.name,
                        handle: account.handle
                    }}/>
                    <div className='flex flex-col break-anywhere'>
                        <span className='line-clamp-1 font-semibold text-black dark:text-white'>{account.name}</span>
                        <span className='line-clamp-1 text-sm text-gray-700 dark:text-gray-600'>{account.handle}</span>
                    </div>
                    {account.blockedByMe || account.domainBlockedByMe ?
                        <Button className='pointer-events-none ml-auto min-w-[90px]' variant='destructive'>Blocked</Button> :
                        !isCurrentUser ? (
                            <FollowButton
                                className='ml-auto'
                                following={account.followedByMe}
                                handle={account.handle}
                                type='secondary'
                                onFollow={onFollow}
                                onUnfollow={onUnfollow}
                            />
                        ) : null
                    }
                </ActivityItem>
            </div>
        </ProfilePreviewHoverCard>
    );
};

interface TopicSearchResultItemProps {
    topic: {slug: string; name: string};
    onOpenChange?: (open: boolean) => void;
    isSelected?: boolean;
    onRefSet?: (ref: HTMLDivElement | null) => void;
}

const TopicSearchResultItem: React.FC<TopicSearchResultItemProps> = ({topic, onOpenChange, isSelected = false, onRefSet}) => {
    const navigate = useNavigateWithBasePath();

    return (
        <div ref={onRefSet}>
            <ActivityItem
                isSelected={isSelected}
                onClick={() => {
                    onOpenChange?.(false);
                    navigate(`/explore/${topic.slug}`);
                }}
            >
                <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900'>
                    <LucideIcon.Globe className='text-gray-700 dark:text-gray-500' size={18} strokeWidth={1.5} />
                </div>
                <div className='flex flex-col'>
                    <span className='font-semibold text-black dark:text-white'>{topic.name}</span>
                    <span className='text-sm text-gray-700 dark:text-gray-600'>Topic</span>
                </div>
            </ActivityItem>
        </div>
    );
};

interface TopicSearchResultsProps {
    topics: {slug: string; name: string}[];
    onOpenChange?: (open: boolean) => void;
    selectedIndex: number;
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    startIndex: number;
}

const TopicSearchResults: React.FC<TopicSearchResultsProps> = ({topics, onOpenChange, selectedIndex, itemRefs, startIndex}) => {
    if (!topics.length) {
        return null;
    }

    return (
        <div>
            {topics.map((topic, index) => (
                <TopicSearchResultItem
                    key={topic.slug}
                    isSelected={selectedIndex === startIndex + index}
                    topic={topic}
                    onOpenChange={onOpenChange}
                    onRefSet={(ref) => {
                        itemRefs.current[startIndex + index] = ref;
                    }}
                />
            ))}
        </div>
    );
};

interface SearchResultsProps {
    results: AccountSearchResult[];
    onUpdate: (id: string, updated: Partial<AccountSearchResult>) => void;
    selectedIndex: number;
    itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    startIndex: number;
}

const SearchResults: React.FC<SearchResultsProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({results, onUpdate, onOpenChange, selectedIndex, itemRefs, startIndex}) => {
    if (!results.length) {
        return null;
    }

    return (
        <div>
            {results.map((account, index) => (
                <AccountSearchResultItem
                    key={account.id}
                    account={account}
                    isSelected={selectedIndex === startIndex + index}
                    update={onUpdate}
                    onOpenChange={onOpenChange}
                    onRefSet={(ref) => {
                        itemRefs.current[startIndex + index] = ref;
                    }}
                />
            ))}
        </div>
    );
};

interface SearchProps {
    onOpenChange?: (open: boolean) => void;
    query: string;
    setQuery: (query: string) => void;
}

const Search: React.FC<SearchProps> = ({onOpenChange, query, setQuery}) => {
    const queryInputRef = useRef<HTMLInputElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
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

    const [displayResults, setDisplayResults] = useState<AccountSearchResult[]>([]);
    const [lastResultState, setLastResultState] = useState<'results' | 'none' | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    // Filter topics client-side (no additional API call needed)
    const matchingTopics = useMemo(() => {
        const topics = topicsData?.topics || [];

        if (!shouldSearch || topics.length === 0) {
            return [];
        }

        const normalizedQuery = query.toLowerCase();

        return topics.filter((topic) => {
            // Exclude "following" meta-topic from search results
            if (topic.slug === 'following') {
                return false;
            }

            return topic.name.toLowerCase().startsWith(normalizedQuery) ||
                   topic.slug.toLowerCase().startsWith(normalizedQuery);
        });
    }, [query, shouldSearch, topicsData?.topics]);

    // Total number of navigable items (topics + accounts)
    const totalItems = matchingTopics.length + displayResults.length;

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

    // Focus the query input on initial render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showSearchResults || totalItems === 0) {
                return;
            }

            switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % totalItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
                break;
            case 'Enter':
                e.preventDefault();
                // Check if selected item is a topic or an account
                if (selectedIndex < matchingTopics.length) {
                    // It's a topic
                    const topic = matchingTopics[selectedIndex];
                    onOpenChange?.(false);
                    navigate(`/explore/${topic.slug}`);
                } else {
                    // It's an account
                    const accountIndex = selectedIndex - matchingTopics.length;
                    const account = displayResults[accountIndex];
                    if (account) {
                        onOpenChange?.(false);
                        navigate(`/profile/${account.handle}`);
                    }
                }
                break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearchResults, totalItems, selectedIndex, matchingTopics, displayResults, onOpenChange, navigate]);

    // Scroll selected item into view
    useEffect(() => {
        const selectedElement = itemRefs.current[selectedIndex];
        if (!selectedElement) {
            return;
        }

        const scrollContainer = selectedElement.closest('[class*="overflow"]') ||
                                selectedElement.parentElement?.parentElement?.parentElement;

        if (!scrollContainer || !('scrollTop' in scrollContainer)) {
            return;
        }

        if (selectedIndex === 0) {
            scrollContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = selectedElement.getBoundingClientRect();
            const stickyHeaderHeight = 72;
            const topSpacing = 18;
            const bottomSpacing = 18;

            const isAboveViewport = elementRect.top < containerRect.top + stickyHeaderHeight + topSpacing;
            const isBelowViewport = elementRect.bottom > containerRect.bottom - bottomSpacing;

            if (isAboveViewport) {
                const scrollOffset = scrollContainer.scrollTop - (containerRect.top + stickyHeaderHeight + topSpacing - elementRect.top);
                scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            } else if (isBelowViewport) {
                const scrollOffset = scrollContainer.scrollTop + (elementRect.bottom - containerRect.bottom + bottomSpacing);
                scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedIndex]);

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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
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
                        <TopicSearchResults
                            itemRefs={itemRefs}
                            selectedIndex={selectedIndex}
                            startIndex={0}
                            topics={matchingTopics}
                            onOpenChange={onOpenChange}
                        />
                        <SearchResults
                            itemRefs={itemRefs}
                            results={displayResults}
                            selectedIndex={selectedIndex}
                            startIndex={matchingTopics.length}
                            onOpenChange={onOpenChange}
                            onUpdate={updateResult}
                        />
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
