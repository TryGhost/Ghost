import FollowButton from './FollowButton';
import React, {useEffect, useState} from 'react';
import getUsername from '../../utils/get-username';
import {Account} from '@src/api/activitypub';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Avatar, AvatarFallback, AvatarImage, Badge, H3, HoverCard, HoverCardContent, HoverCardTrigger, LucideIcon, Skeleton, abbreviateNumber} from '@tryghost/shade';
import {openLinksInNewTab, stripHtml} from '../../utils/content-formatters';
import {useAccountForUser} from '../../hooks/use-activity-pub-queries';
import {useFeatureFlags} from '../../lib/feature-flags';

type ProfilePreviewHoverCardProps = {
    actor?: ActorProperties | Account | null;
    children: React.ReactNode;
    disabled?: boolean;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    isCurrentUser?: boolean;
};

const isActorProperties = (actor: ActorProperties | Account): actor is ActorProperties => {
    return 'preferredUsername' in actor;
};

const ProfilePreviewHoverCard: React.FC<ProfilePreviewHoverCardProps> = ({
    actor,
    children,
    disabled = false,
    side = 'bottom',
    align = 'start',
    isCurrentUser = false
}) => {
    const {isEnabled} = useFeatureFlags();
    const [shouldFetch, setShouldFetch] = useState(false);

    let targetHandle = actor?.handle;
    if (!targetHandle && actor && isActorProperties(actor)) {
        targetHandle = getUsername(actor);
    }

    const bypassHover = !isEnabled('preview') || disabled || (!targetHandle && !actor);

    const accountQuery = useAccountForUser('index', targetHandle || '', {
        enabled: shouldFetch && Boolean(targetHandle)
    });

    const hasCompleteAccountData = accountQuery.data ? (
        typeof accountQuery.data.followerCount === 'number' &&
        typeof accountQuery.data.followingCount === 'number' &&
        accountQuery.data.bio !== undefined
    ) : false;

    useEffect(() => {
        if (!shouldFetch || !targetHandle) {
            return;
        }

        if (!hasCompleteAccountData && !accountQuery.isFetching && !accountQuery.isLoading) {
            accountQuery.refetch({cancelRefetch: false});
        }
    }, [accountQuery, accountQuery.isFetching, accountQuery.isLoading, accountQuery.refetch, hasCompleteAccountData, shouldFetch, targetHandle]);

    if (bypassHover) {
        return <>{children}</>;
    }

    const accountData = accountQuery.data;
    const displayData = accountData || actor;

    const displayHandle = displayData?.handle ?? targetHandle ?? '';
    const displayName = displayData?.name ?? '';
    const avatarUrl = displayData?.avatarUrl ?? (actor && isActorProperties(actor) ? actor.icon?.url : null) ?? null;
    const followsYou = Boolean(displayData?.followsMe);
    const followingCount = typeof displayData?.followingCount === 'number' ? displayData.followingCount : (Number(displayData?.followingCount) || 0);
    const followerCount = typeof displayData?.followerCount === 'number' ? displayData.followerCount : (Number(displayData?.followerCount) || 0);
    const bio = displayData?.bio ? openLinksInNewTab(stripHtml(displayData.bio, ['a'])) : undefined;

    return (
        <HoverCard onOpenChange={setShouldFetch}>
            <HoverCardTrigger>
                {children}
            </HoverCardTrigger>
            <HoverCardContent
                align={align}
                className='w-[320px] rounded-2xl border-0 p-5 text-left text-gray-900 shadow-[0_5px_24px_0px_rgba(0,0,0,0.02),0px_2px_5px_0px_rgba(0,0,0,0.07),0px_0px_1px_0px_rgba(0,0,0,0.25)] outline-none dark:bg-[#101114] dark:shadow-none'
                side={side}
                sideOffset={12}
            >
                <div className='flex flex-col gap-2'>
                    <div className='flex flex-col gap-2'>
                        <div className='flex justify-between'>
                            <Avatar className='size-14'>
                                {avatarUrl && (
                                    <AvatarImage
                                        alt={displayName}
                                        className='rounded-full outline outline-[0.5px] outline-offset-[-0.5px] outline-black/10'
                                        src={avatarUrl}
                                        onError={(event) => {
                                            (event.target as HTMLImageElement).src = '';
                                            (event.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                                <AvatarFallback className='bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200'>
                                    <LucideIcon.UserRound className='size-5 text-gray-500 dark:text-gray-400' strokeWidth={1.5} />
                                </AvatarFallback>
                            </Avatar>
                            {!isCurrentUser && (
                                <FollowButton
                                    following={!!displayData?.followedByMe}
                                    handle={displayHandle}
                                    type='primary'
                                />
                            )}
                        </div>
                        <div className='flex flex-col items-start'>
                            <H3 className='w-full truncate'>{displayName}</H3>
                            <div className='flex w-full gap-2'>
                                <span className='truncate text-gray-700 dark:text-gray-600'>{displayHandle}</span>
                                {followsYou && !isCurrentUser && (
                                    <Badge className='mt-px whitespace-nowrap' variant='secondary'>Follows you</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='flex gap-3 dark:text-gray-300'>
                        {(accountQuery.isLoading || accountQuery.isFetching) ? (
                            <Skeleton className='h-4 w-32' />
                        ) : (
                            <>
                                <span>
                                    <span className='font-bold text-black dark:text-white'>{abbreviateNumber(followingCount)}</span>
                                    {' '}Following
                                </span>
                                <span>
                                    <span className='font-bold text-black dark:text-white'>{abbreviateNumber(followerCount)}</span>
                                    {' '}Followers
                                </span>
                            </>
                        )}
                    </div>
                    {(accountQuery.isLoading || accountQuery.isFetching) ? (
                        <Skeleton className='h-4 w-48' />
                    ) : bio ? (
                        <div dangerouslySetInnerHTML={{__html: bio}} className='leading-tight dark:text-gray-300' />
                    ) : null}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};

export default ProfilePreviewHoverCard;
