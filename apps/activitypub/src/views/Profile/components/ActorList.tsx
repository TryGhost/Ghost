import APAvatar from '@src/components/global/APAvatar';
import ActivityItem from '@src/components/activities/ActivityItem';
import FollowButton from '@src/components/global/FollowButton';
import ProfilePreviewHoverCard from '@components/global/ProfilePreviewHoverCard';
import React, {useEffect, useRef} from 'react';
import getName from '@src/utils/get-name';
import getUsername from '@src/utils/get-username';
import {Actor} from '@src/api/activitypub';
import {Button, LoadingIndicator, LucideIcon, NoValueLabel, NoValueLabelIcon} from '@tryghost/shade';
import {handleProfileClick} from '@src/utils/handle-profile-click';
import {useAccountForUser} from '@src/hooks/use-activity-pub-queries';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

type ActorListProps = {
    noResultsMessage: string,
    actors: Actor[],
    isLoading: boolean,
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
};

const ActorList: React.FC<ActorListProps> = ({
    noResultsMessage,
    actors,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
}) => {
    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = currentAccountQuery;

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const navigate = useNavigateWithBasePath();

    return (
        <div className='pt-3' data-testid="actor-list">
            {
                hasNextPage === false && actors.length === 0 ? (
                    <NoValueLabel>
                        <NoValueLabelIcon><LucideIcon.UserRoundPlus /></NoValueLabelIcon>
                        {noResultsMessage}
                    </NoValueLabel>
                ) : (
                    <div className='flex flex-col'>
                        {actors.map(({actor, isFollowing, blockedByMe, domainBlockedByMe}) => {
                            const actorHandle = actor.handle || getUsername(actor);
                            const isCurrentUser = actorHandle === currentUser?.handle;

                            return (
                                <React.Fragment key={actor.id}>
                                    <ProfilePreviewHoverCard actor={actor} align='center' isCurrentUser={isCurrentUser} side='left'>
                                        <div>
                                            <ActivityItem key={actor.id}
                                                data-testid="actor-item"
                                                onClick={() => {
                                                    handleProfileClick(actor, navigate);
                                                }}
                                            >
                                                <APAvatar author={actor} />
                                                <div>
                                                    <div className='text-gray-600 break-anywhere'>
                                                        <span className='mr-1 line-clamp-1 font-bold text-black dark:text-white'>{getName(actor)}</span>
                                                        <div className='line-clamp-1 text-sm'>{actorHandle}</div>
                                                    </div>
                                                </div>
                                                {blockedByMe || domainBlockedByMe ?
                                                    <Button className='pointer-events-none ml-auto min-w-[90px]' variant='destructive'>Blocked</Button> :
                                                    !isCurrentUser ? (
                                                        <FollowButton
                                                            className='ml-auto'
                                                            data-testid="follow-button"
                                                            following={isFollowing}
                                                            handle={actorHandle}
                                                            type='secondary'
                                                        />
                                                    ) : null
                                                }
                                            </ActivityItem>
                                        </div>
                                    </ProfilePreviewHoverCard>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )
            }
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isFetchingNextPage || isLoading) && (
                    <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </div>
                )
            }
        </div>
    );
};

export default ActorList;
