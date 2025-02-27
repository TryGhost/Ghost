import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import FollowButton from '@components/global/FollowButton';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import ViewProfileModal from '@components/modals/ViewProfileModal';
import {Dialog, DialogContent, DialogTrigger, LucideIcon, Skeleton} from '@tryghost/shade';
import {LoadingIndicator, NoValueLabel, TextField} from '@tryghost/admin-x-design-system';
import {type Profile} from '../../api/activitypub';
import {useDebounce} from 'use-debounce';
import {useSearchForUser, useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

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

    return (
        <ActivityItem
            key={account.id}
            onClick={() => {
                onOpenChange?.(false);
                NiceModal.show(ViewProfileModal, {handle: account.handle, onFollow, onUnfollow});
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
                <span className='font-semibold text-black'>{account.name}</span>
                <span className='text-sm text-gray-700'>{account.handle}</span>
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
    return (
        <>
            {results.map(account => (
                <AccountSearchResultItem
                    key={account.id}
                    account={account}
                    update={onUpdate}
                    onOpenChange={onOpenChange}
                />
            ))}
        </>
    );
};

interface SuggestedProfileProps {
    profile: Profile;
    update: (id: string, updated: Partial<Profile>) => void;
    isLoading: boolean;
}

const SuggestedProfile: React.FC<SuggestedProfileProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({profile, update, isLoading, onOpenChange}) => {
    const onFollow = () => {
        update(profile.actor.id, {
            isFollowing: true,
            followerCount: profile.followerCount + 1
        });
    };

    const onUnfollow = () => {
        update(profile.actor.id, {
            isFollowing: false,
            followerCount: profile.followerCount - 1
        });
    };

    return (
        <ActivityItem
            key={profile.actor.id}
            onClick={() => {
                onOpenChange?.(false);
                NiceModal.show(ViewProfileModal, {handle: profile.handle, onFollow, onUnfollow});
            }}
        >
            <APAvatar author={profile.actor}/>
            <div className='flex grow flex-col'>
                <span className='font-semibold text-black dark:text-white'>{!isLoading ? profile.actor.name : <Skeleton className='w-full max-w-64' />}</span>
                <span className='text-sm text-gray-700 dark:text-gray-600'>{!isLoading ? profile.handle : <Skeleton className='w-24' />}</span>
            </div>
            {!isLoading ?
                <FollowButton
                    className='ml-auto'
                    following={profile.isFollowing}
                    handle={profile.handle}
                    type='secondary'
                    onFollow={onFollow}
                    onUnfollow={onUnfollow}
                /> :
                <div className='inline-flex items-center'>
                    <Skeleton className='w-12' />
                </div>
            }
        </ActivityItem>
    );
};

interface SuggestedProfilesProps {
    profiles: Profile[];
    isLoading: boolean;
    onUpdate: (id: string, updated: Partial<Profile>) => void;
}

const SuggestedProfiles: React.FC<SuggestedProfilesProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({profiles, isLoading, onUpdate, onOpenChange}) => {
    return (
        <div className='flex flex-col gap-2'>
            <span className='mb-1 flex w-full max-w-[620px] font-semibold'>
                Suggested accounts
            </span>
            <div className='flex flex-col'>
                {profiles.map((profile) => {
                    return (
                        <React.Fragment key={profile.actor.id}>
                            <SuggestedProfile
                                isLoading={isLoading}
                                profile={profile}
                                update={onUpdate}
                                onOpenChange={onOpenChange}
                            />
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

interface SearchInputProps extends React.HTMLAttributes<HTMLDivElement> {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({open, onOpenChange}) => {
    // Initialise suggested profiles
    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 6);
    const {data: suggestedProfilesData, isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;
    const suggestedProfiles = suggestedProfilesData || Array(5).fill({
        actor: {},
        handle: '',
        followerCount: 0,
        followingCount: 0,
        isFollowing: false
    });

    // Initialise search query
    const queryInputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger>
                <div className='inline-flex h-9 w-[274px] items-center justify-start gap-2 rounded-full bg-gray-100 px-3 text-md font-normal text-gray-600 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-925 dark:text-gray-700 dark:hover:bg-gray-950 [&_svg]:size-[18px]'>
                    <LucideIcon.Search size={18} strokeWidth={1.5} /> Search
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogContent>
                    <div className='-mt-2 flex items-center gap-2'>
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
                            <SuggestedProfiles
                                isLoading={isLoadingSuggestedProfiles}
                                profiles={suggestedProfiles}
                                onOpenChange={onOpenChange}
                                onUpdate={updateSuggestedProfile}
                            />
                        )}
                    </div>
                </DialogContent>
            </DialogContent>
        </Dialog>
    );
};

export default SearchInput;
