import React, {useEffect, useRef, useState} from 'react';
import {Skeleton} from '@tryghost/shade';

import NiceModal from '@ebay/nice-modal-react';
import {Button, Icon, LoadingIndicator, NoValueLabel, TextField} from '@tryghost/admin-x-design-system';
import {useDebounce} from 'use-debounce';

import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import FollowButton from '@components/global/FollowButton';
import Separator from '@components/global/Separator';
import ViewProfileModal from '@components/modals/ViewProfileModal';

import {type Profile} from '../../api/activitypub';
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

const AccountSearchResultItem: React.FC<AccountSearchResultItemProps> = ({account, update}) => {
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

const SearchResults: React.FC<SearchResultsProps> = ({results, onUpdate}) => {
    return (
        <>
            {results.map(account => (
                <AccountSearchResultItem
                    key={account.id}
                    account={account}
                    update={onUpdate}
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

const SuggestedProfile: React.FC<SuggestedProfileProps> = ({profile, update, isLoading}) => {
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

const SuggestedProfiles: React.FC<SuggestedProfilesProps> = ({profiles, isLoading, onUpdate}) => {
    return (
        <>
            <span className='mb-1 flex w-full max-w-[620px] font-semibold'>
                Suggested accounts
            </span>
            {profiles.map((profile, index) => {
                return (
                    <React.Fragment key={profile.actor.id}>
                        <SuggestedProfile
                            isLoading={isLoading}
                            profile={profile}
                            update={onUpdate}
                        />
                        {index < profiles.length - 1 && <Separator />}
                    </React.Fragment>
                );
            })}
        </>
    );
};

interface SearchProps {}

const Search: React.FC<SearchProps> = ({}) => {
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
    const showSuggested = query === '' || (isFetched && results.length === 0);

    // Focus the query input on initial render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    return (
        <>
            <div className='z-0 mx-auto flex w-full max-w-[620px] flex-col items-center pt-8'>
                <div className='relative flex w-full items-center'>
                    <Icon className='absolute left-3 top-3 z-10' colorClass='text-gray-500' name='magnifying-glass' size='sm' />
                    <TextField
                        autoComplete='off'
                        className='mb-6 mr-12 flex h-10 w-full items-center rounded-lg border border-transparent bg-gray-100 px-[33px] py-1.5 transition-colors focus:border-green focus:bg-white focus:outline-2 tablet:mr-0 dark:border-transparent dark:bg-gray-925 dark:text-white dark:placeholder:text-gray-800 dark:focus:border-green dark:focus:bg-gray-950'
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
                    {query && (
                        <Button
                            className='absolute top-3 p-1 sm:right-14 tablet:right-3'
                            icon='close'
                            iconColorClass='text-gray-700 !w-[10px] !h-[10px]'
                            size='sm'
                            unstyled
                            onClick={() => {
                                setQuery('');
                                queryInputRef.current?.focus();
                            }}
                        />
                    )}
                </div>
                {showLoading && <LoadingIndicator size='lg'/>}

                {showNoResults && (
                    <NoValueLabel icon='user'>
                        No users matching this handle or account URL
                    </NoValueLabel>
                )}

                {!showLoading && !showNoResults && (
                    <SearchResults
                        results={results}
                        onUpdate={updateResult}
                    />
                )}

                {showSuggested && (
                    <SuggestedProfiles
                        isLoading={isLoadingSuggestedProfiles}
                        profiles={suggestedProfiles}
                        onUpdate={updateSuggestedProfile}
                    />
                )}
            </div>
        </>
    );
};

export default Search;
