import React, {useEffect, useRef, useState} from 'react';

import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Icon, LoadingIndicator, NoValueLabel, TextField} from '@tryghost/admin-x-design-system';
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
                NiceModal.show(ProfileSearchResultModal, {profile: result, onFollow, onUnfollow});
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

const Search: React.FC<SearchProps> = ({}) => {
    // Initialise suggested profiles
    const [suggested, setSuggested] = useState<SearchResultItem[]>([
        {
            actor: {
                id: 'https://mastodon.social/@quillmatiq',
                name: 'Anuj Ahooja',
                preferredUsername: '@quillmatiq@mastodon.social',
                image: {
                    url: 'https://anujahooja.com/assets/images/image12.jpg?v=601ebe30'
                },
                icon: {
                    url: 'https://anujahooja.com/assets/images/image12.jpg?v=601ebe30'
                }
            } as ActorProperties,
            handle: '@quillmatiq@mastodon.social',
            followerCount: 436,
            followingCount: 634,
            isFollowing: false,
            posts: []
        },
        {
            actor: {
                id: 'https://flipboard.social/@miaq',
                name: 'Mia Quagliarello',
                preferredUsername: '@miaq@flipboard.social',
                image: {
                    url: 'https://m-cdn.flipboard.social/accounts/avatars/109/824/428/955/351/328/original/383f288b81ab280c.png'
                },
                icon: {
                    url: 'https://m-cdn.flipboard.social/accounts/avatars/109/824/428/955/351/328/original/383f288b81ab280c.png'
                }
            } as ActorProperties,
            handle: '@miaq@flipboard.social',
            followerCount: 533,
            followingCount: 335,
            isFollowing: false,
            posts: []
        },
        {
            actor: {
                id: 'https://techpolicy.social/@mallory',
                name: 'Mallory',
                preferredUsername: '@mallory@techpolicy.social',
                image: {
                    url: 'https://techpolicy.social/system/accounts/avatars/109/378/338/180/403/396/original/20b043b0265cac73.jpeg'
                },
                icon: {
                    url: 'https://techpolicy.social/system/accounts/avatars/109/378/338/180/403/396/original/20b043b0265cac73.jpeg'
                }
            } as ActorProperties,
            handle: '@mallory@techpolicy.social',
            followerCount: 1100,
            followingCount: 11,
            isFollowing: false,
            posts: []
        }
    ]);

    const updateSuggested = (id: string, updated: Partial<SearchResultItem>) => {
        const index = suggested.findIndex(result => result.actor.id === id);

        setSuggested((current) => {
            const newSuggested = [...current];
            newSuggested[index] = {...newSuggested[index], ...updated};
            return newSuggested;
        });
    };

    // Initialise search query
    const queryInputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [isQuerying, setIsQuerying] = useState(false);
    const {searchQuery, updateProfileSearchResult: updateResult} = useSearchForUser('index', query !== '' ? debouncedQuery : query);
    const {data, isFetching, isFetched} = searchQuery;

    const results = data?.profiles || [];
    const showLoading = (isFetching || isQuerying) && !isFetched;
    const showNoResults = isFetched && results.length === 0;
    const showSuggested = query === '' || (isFetched && results.length === 0);

    useEffect(() => {
        if (query !== '') {
            setIsQuerying(true);
        } else {
            setIsQuerying(false);
        }
    }, [query]);

    // Focus the query input on initial render
    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    return (
        <>
            <MainNavigation title='Search' />
            <div className='z-0 flex w-full flex-col items-center pt-8'>
                <div className='relative flex w-full max-w-[560px] items-center '>
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
                {showLoading && (
                    <LoadingIndicator size='lg'/>
                )}
                {showNoResults && (
                    <NoValueLabel icon='user'>
                        No users matching this username
                    </NoValueLabel>
                )}
                {results.map(result => (
                    <SearchResult
                        key={(result as SearchResultItem).actor.id}
                        result={result as SearchResultItem}
                        update={updateResult}
                    />
                ))}
                {showSuggested && (
                    <>
                        <span className='mb-1 flex w-full max-w-[560px] font-semibold'>Suggested accounts</span>
                        {suggested.map(profile => (
                            <SearchResult
                                key={profile.actor.id}
                                result={profile}
                                update={updateSuggested}
                            />
                        ))}
                    </>
                )}
            </div>
        </>
    );
};

export default Search;
