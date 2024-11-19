import React, {useEffect, useRef, useState} from 'react';

import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Icon, LoadingIndicator, NoValueLabel, TextField} from '@tryghost/admin-x-design-system';
import {useDebounce} from 'use-debounce';

import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FollowButton from './global/FollowButton';
import MainNavigation from './navigation/MainNavigation';

import NiceModal from '@ebay/nice-modal-react';
import ViewProfileModal from './global/ViewProfileModal';

import Separator from './global/Separator';
import useSuggestedProfiles from '../hooks/useSuggestedProfiles';
import {useSearchForUser} from '../hooks/useActivityPubQueries';

interface SearchResultItem {
    actor: ActorProperties;
    handle: string;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
    posts: Activity[];
}

interface SearchResultProps {
    result: SearchResultItem;
    update: (id: string, updated: Partial<SearchResultItem>) => void;
}

interface SearchProps {}

const SearchResult: React.FC<SearchResultProps> = ({result, update}) => {
    const onFollow = () => {
        update(result.actor.id!, {
            isFollowing: true,
            followerCount: result.followerCount + 1
        });
    };

    const onUnfollow = () => {
        update(result.actor.id!, {
            isFollowing: false,
            followerCount: result.followerCount - 1
        });
    };

    return (
        <ActivityItem
            key={result.actor.id}
            onClick={() => {
                NiceModal.show(ViewProfileModal, {profile: result, onFollow, onUnfollow});
            }}
        >
            <APAvatar author={result.actor}/>
            <div>
                <div className='text-grey-600'>
                    <span className='font-bold text-black'>{result.actor.name} </span>{result.handle}
                </div>
                <div className='text-sm'>{new Intl.NumberFormat().format(result.followerCount)} followers</div>
            </div>
            <FollowButton
                className='ml-auto'
                following={result.isFollowing}
                handle={result.handle}
                type='link'
                onFollow={onFollow}
                onUnfollow={onUnfollow}
            />
        </ActivityItem>
    );
};

const SearchResults: React.FC<{
    results: SearchResultItem[];
    onUpdate: (id: string, updated: Partial<SearchResultItem>) => void;
}> = ({results, onUpdate}) => {
    return (
        <>
            {results.map(result => (
                <SearchResult
                    key={result.actor.id}
                    result={result}
                    update={onUpdate}
                />
            ))}
        </>
    );
};

const SuggestedAccounts: React.FC<{
    profiles: SearchResultItem[];
    isLoading: boolean;
    onUpdate: (id: string, updated: Partial<SearchResultItem>) => void;
}> = ({profiles, isLoading, onUpdate}) => {
    return (
        <>
            <span className='mb-1 flex w-full max-w-[560px] font-semibold'>
                Suggested accounts
            </span>
            {isLoading && (
                <div className='p-4'>
                    <LoadingIndicator size='md'/>
                </div>
            )}
            {profiles.map((profile, index) => {
                return (
                    <React.Fragment key={profile.actor.id}>
                        <SearchResult
                            key={profile.actor.id}
                            result={profile}
                            update={onUpdate}
                        />
                        {index < profiles.length - 1 && <Separator />}
                    </React.Fragment>
                );
            })}
        </>
    );
};

const Search: React.FC<SearchProps> = ({}) => {
    // Initialise suggested profiles
    const {suggested, isLoadingSuggested, updateSuggestedProfile} = useSuggestedProfiles(6);

    // Initialise search query
    const queryInputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const {searchQuery, updateProfileSearchResult: updateResult} = useSearchForUser('index', query !== '' ? debouncedQuery : query);
    const {data, isFetching, isFetched} = searchQuery;

    const results = data?.profiles || [];
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
            <MainNavigation page='search' />
            <div className='z-0 mx-auto flex w-full max-w-[560px] flex-col items-center pt-8'>
                <div className='relative flex w-full items-center'>
                    <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                    <TextField
                        className='mb-6 mr-12 flex h-10 w-full items-center rounded-lg border border-transparent bg-grey-100 px-[33px] py-1.5 transition-colors focus:border-green focus:bg-white focus:outline-2 dark:border-transparent dark:bg-grey-925 dark:text-white dark:placeholder:text-grey-800 dark:focus:border-green dark:focus:bg-grey-950 tablet:mr-0'
                        containerClassName='w-100'
                        inputRef={queryInputRef}
                        placeholder='Enter a username...'
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
                            iconColorClass='text-grey-700 !w-[10px] !h-[10px]'
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
                        No users matching this username
                    </NoValueLabel>
                )}

                {!showLoading && !showNoResults && (
                    <SearchResults
                        results={results as SearchResultItem[]}
                        onUpdate={updateResult}
                    />
                )}

                {showSuggested && (
                    <SuggestedAccounts
                        isLoading={isLoadingSuggested}
                        profiles={suggested as SearchResultItem[]}
                        onUpdate={updateSuggestedProfile}
                    />
                )}
            </div>
        </>
    );
};

export default Search;
