import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import FollowButton from '@components/global/FollowButton';
import ProfilePreviewHoverCard from '../global/ProfilePreviewHoverCard';
import React, {useEffect, useRef, useState} from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, Input, LoadingIndicator, LucideIcon, NoValueLabel, NoValueLabelIcon} from '@tryghost/shade';
import {SuggestedProfiles} from '../global/SuggestedProfiles';
import {useAccountForUser, useSearchForUser} from '@hooks/use-activity-pub-queries';
import {useDebounce} from 'use-debounce';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

interface AccountSearchResult {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    followerCount: number;
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
}> = ({account, update, onOpenChange}) => {
    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = currentAccountQuery;
    const isCurrentUser = account.handle === currentUser?.handle;

    const onFollow = () => {
        update(account.id, {
            followedByMe: true,
            followerCount: account.followerCount + 1
        });
    };

    const onUnfollow = () => {
        update(account.id, {
            followedByMe: false,
            followerCount: account.followerCount - 1
        });
    };

    const navigate = useNavigateWithBasePath();

    return (
        <ProfilePreviewHoverCard actor={account as unknown as ActorProperties} align='center' isCurrentUser={isCurrentUser} side='left'>
            <div>
                <ActivityItem
                    key={account.id}
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

interface SearchResultsProps {
    results: AccountSearchResult[];
    onUpdate: (id: string, updated: Partial<AccountSearchResult>) => void;
}

const SearchResults: React.FC<SearchResultsProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({results, onUpdate, onOpenChange}) => {
    if (!results.length) {
        return null;
    }

    return (
        <div className='mt-[-14px] pb-2'>
            {results.map(account => (
                <AccountSearchResultItem
                    key={account.id}
                    account={account}
                    update={onUpdate}
                    onOpenChange={onOpenChange}
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
    const [debouncedQuery] = useDebounce(query, 300);
    const shouldSearch = query.length >= 2;
    const {searchQuery, updateAccountSearchResult: updateResult} = useSearchForUser('index', shouldSearch ? debouncedQuery : '');
    const {data, isFetching, isFetched} = searchQuery;

    const [displayResults, setDisplayResults] = useState<AccountSearchResult[]>([]);

    useEffect(() => {
        if (data?.accounts && data.accounts.length > 0) {
            setDisplayResults(data.accounts);
        } else if (!isFetching && shouldSearch) {
            setDisplayResults([]);
        }
    }, [data?.accounts, isFetching, shouldSearch]);

    const showLoading = isFetching && shouldSearch;
    const showNoResults = !isFetching && isFetched && displayResults.length === 0 && shouldSearch && debouncedQuery === query;
    const showSuggested = query.length < 2 || (showLoading && displayResults.length === 0);
    const showSearchResults = shouldSearch && displayResults.length > 0;

    // Focus the query input on initial render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

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
                    <SearchResults
                        results={displayResults}
                        onOpenChange={onOpenChange}
                        onUpdate={updateResult}
                    />
                )}
                {showSuggested && (
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
