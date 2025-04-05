import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import FollowButton from '@components/global/FollowButton';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import ViewProfileModal from '@components/modals/ViewProfileModal';
import {H4, LucideIcon} from '@tryghost/shade';
import {LoadingIndicator, NoValueLabel, TextField} from '@tryghost/admin-x-design-system';
import {SuggestedProfiles} from '../global/SuggestedProfiles';
import {useDebounce} from 'use-debounce';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useSearchForUser} from '@hooks/use-activity-pub-queries';

interface AccountSearchResult {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    followerCount: number;
    followedByMe: boolean;
}

interface AccountSearchResultItemProps {
    account: AccountSearchResult;
    update: (id: string, updated: Partial<AccountSearchResult>) => void;
}

const AccountSearchResultItem: React.FC<AccountSearchResultItemProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({account, update, onOpenChange}) => {
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

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    return (
        <ActivityItem
            key={account.id}
            onClick={() => {
                if (isEnabled('ap-routes')) {
                    navigate(`/profile/${account.handle}`);
                } else {
                    onOpenChange?.(false);
                    NiceModal.show(ViewProfileModal, {handle: account.handle, onFollow, onUnfollow});
                }
            }}
        >
            <APAvatar author={{
                icon: {
                    url: account.avatarUrl
                },
                name: account.name,
                handle: account.handle
            }}/>
            <div className='flex flex-col'>
                <span className='font-semibold text-black dark:text-white'>{account.name}</span>
                <span className='text-sm text-gray-700 dark:text-gray-600'>{account.handle}</span>
            </div>
            <FollowButton
                className='ml-auto'
                following={account.followedByMe}
                handle={account.handle}
                type='secondary'
                onFollow={onFollow}
                onUnfollow={onUnfollow}
            />
        </ActivityItem>
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
        <div className='mt-[-7px]'>
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
    // Initialise search query
    const queryInputRef = useRef<HTMLInputElement>(null);
    const [debouncedQuery] = useDebounce(query, 300);
    const {searchQuery, updateAccountSearchResult: updateResult} = useSearchForUser('index', query !== '' ? debouncedQuery : query);
    const {data, isFetching, isFetched} = searchQuery;

    const results = data?.accounts || [];
    const showLoading = isFetching && query.length > 0;
    const showNoResults = !isFetching && isFetched && results.length === 0 && query.length > 0 && debouncedQuery === query;
    const showSuggested = query === '';

    // Focus the query input on initial render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    return (
        <>
            <div className='-mx-6 -mt-6 flex items-center gap-2 border-b border-b-gray-150 px-6 pb-[10px] pt-3 dark:border-b-gray-950'>
                <LucideIcon.Search className='text-gray-600' size={18} strokeWidth={1.5} />
                <TextField
                    autoComplete='off'
                    className='mr-12 flex h-10 w-full items-center rounded-lg border-0 bg-transparent px-0 py-1.5 transition-colors focus:border-0 focus:bg-transparent focus:outline-0 tablet:mr-0 dark:text-white dark:placeholder:text-gray-800'
                    containerClassName='w-100'
                    inputRef={queryInputRef}
                    placeholder='Enter a handle or account URL...'
                    title="Search"
                    type='text'
                    value={query}
                    clearBg
                    hideTitle
                    unstyled
                    onChange={e => setQuery(e.target.value)}
                />
            </div>
            <div className='min-h-[320px]'>
                {showLoading && (
                    <div className='flex h-full items-center justify-center pb-8'>
                        <LoadingIndicator size='lg' />
                    </div>
                )}
                {showNoResults && (
                    <div className='flex h-full items-center justify-center pb-8'>
                        <NoValueLabel icon='user'>
                            No users matching this handle or account URL
                        </NoValueLabel>
                    </div>
                )}
                {!showLoading && !showNoResults && (
                    <SearchResults
                        results={results}
                        onOpenChange={onOpenChange}
                        onUpdate={updateResult}
                    />
                )}
                {showSuggested && (
                    <>
                        <H4>Suggested accounts</H4>
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
