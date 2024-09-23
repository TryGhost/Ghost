import React, {useEffect, useRef, useState} from 'react';

import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';
import {useDebounce} from 'use-debounce';

import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FollowButton from './global/FollowButton';
import MainNavigation from './navigation/MainNavigation';

import NiceModal from '@ebay/nice-modal-react';
import ProfileSearchResultModal from './search/ProfileSearchResultModal';

import {useSearchForUser} from '../hooks/useActivityPubQueries';

interface SearchResultItem {
    actor: ActorProperties;
    handle: string;
    followerCount: number;
    isFollowing: boolean;
}

interface SearchResultProps {
    result: SearchResultItem;
}

interface SearchProps {}

const SUGGESTED_RESULTS: SearchResultItem[] = [
    {
        actor: {
            id: 'https://example.com/users/foobarbaz',
            name: 'Foo bar baz'
        } as ActorProperties,
        handle: '@foo@bar.baz',
        followerCount: 123,
        isFollowing: true
    },
    {
        actor: {
            id: 'https://example.com/users/bazbarfoo',
            name: 'Baz bar foo'
        } as ActorProperties,
        handle: '@baz@bar.foo',
        followerCount: 456,
        isFollowing: false
    }
];

const SearchResult: React.FC<SearchResultProps> = ({result}) => {
    return (
        <ActivityItem
            key={result.actor.id}
            onClick={() => {
                NiceModal.show(ProfileSearchResultModal, {profile: result});
            }}
        >
            <APAvatar author={result.actor}/>
            <div>
                <div className='text-grey-600'>
                    <span className='font-bold text-black'>{result.actor.name} </span>{result.handle}
                </div>
                <div className='text-sm'>{result.followerCount} followers</div>
            </div>
            {result.isFollowing === false && (
                <FollowButton
                    className='ml-auto'
                    toFollow={result.handle}
                    type='link'
                />
            )}
        </ActivityItem>
    );
};

const Search: React.FC<SearchProps> = ({}) => {
    const queryInputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const {data, isFetching} = useSearchForUser('index', debouncedQuery);

    const results = data?.profiles || [];

    const showNoResults = results.length === 0 && query !== '' && !isFetching;
    const showSuggestedResults = query === '' || (results.length === 0 && query !== '');

    // Focus the query input on first render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    return (
        <>
            <MainNavigation title='Search' />
            <div className='z-0 flex w-full flex-col items-center pt-8'>
                <div className='mb-6 flex w-full max-w-[560px] items-center gap-2 rounded-full bg-grey-100 px-3 py-2 text-grey-500'>
                    <Icon name='magnifying-glass' size={18} />
                    <input
                        ref={queryInputRef}
                        className='w-full bg-transparent'
                        placeholder='Search the Fediverse'
                        type='text'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                {isFetching && (
                    <div className='mb-3 text-grey-500'>Loading...</div>
                )}
                {showNoResults && (
                    <div className='mb-3 text-grey-500'>No results</div>
                )}
                {results.map(result => (
                    <SearchResult key={(result as SearchResultItem).actor.id} result={result as SearchResultItem} />
                ))}
                {showSuggestedResults && (
                    <>
                        <div className='mb-3 flex w-full max-w-[560px] font-bold'>Suggested accounts</div>
                        {SUGGESTED_RESULTS.map(profile => (
                            <SearchResult key={profile.actor.id} result={profile} />
                        ))}
                    </>
                )}
            </div>
        </>
    );
};

export default Search;
