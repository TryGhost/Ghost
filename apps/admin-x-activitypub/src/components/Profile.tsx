import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import React, {useEffect, useRef, useState} from 'react';
import getUsername from '../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, List, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';
import {
    useFollowersCountForUser,
    useFollowersForUser,
    useFollowingCountForUser,
    useFollowingForUser,
    useLikedForUser,
    useUserDataForUser
} from '../hooks/useActivityPubQueries';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const {data: followersCount = 0} = useFollowersCountForUser('index');
    const {data: followingCount = 0} = useFollowingCountForUser('index');
    const {data: following = []} = useFollowingForUser('index');
    const {data: followers = []} = useFollowersForUser('index');
    const {data: liked = []} = useLikedForUser('index');
    // Replace 'index' with the actual handle of the user
    const {data: userProfile} = useUserDataForUser('index') as {data: ActorProperties | null};

    type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const layout = 'feed';

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (<div><NoValueLabel icon='pen'>
                You haven&apos;t posted anything yet.
            </NoValueLabel></div>),
            counter: 240
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: (
                <div className='ap-likes'>
                    {liked.length === 0 ? (
                        <NoValueLabel icon='heart'>
                            You haven&apos;t liked anything yet.
                        </NoValueLabel>
                    ) : (
                        <ul className='mx-auto flex max-w-[640px] flex-col'>
                            {liked.map((activity, index) => (
                                <li
                                    key={activity.id}
                                    data-test-view-article
                                >
                                    <FeedItem
                                        actor={activity.actor}
                                        layout={layout}
                                        object={Object.assign({}, activity.object, {liked: true})}
                                        type={activity.type}
                                        onCommentClick={() => {}}
                                    />
                                    {index < liked.length - 1 && (
                                        <div className="h-px w-full bg-grey-200"></div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ),
            counter: liked.length
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <div>
                    {following.length === 0 ? (
                        <NoValueLabel icon='user-add'>
                            You haven&apos;t followed anyone yet.
                        </NoValueLabel>
                    ) : (
                        <List>
                            {following.map((item) => {
                                return (
                                    <ActivityItem key={item.id} url={item.url}>
                                        <APAvatar author={item} />
                                        <div>
                                            <div className='text-grey-600'>
                                                <span className='mr-1 font-bold text-black'>{item.name || item.preferredUsername || 'Unknown'}</span>
                                                <div className='text-sm'>{getUsername(item)}</div>
                                            </div>
                                        </div>
                                        <Button className='ml-auto' color='grey' label='Unfollow' link={true} onClick={(e) => {
                                            e?.preventDefault();
                                            alert('Implement me!');
                                        }} />
                                    </ActivityItem>
                                );
                            })}
                        </List>
                    )}
                </div>
            ),
            counter: followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div>
                    {followers.length === 0 ? (
                        <NoValueLabel icon='user-add'>
                            Nobody&apos;s following you yet. Their loss!
                        </NoValueLabel>
                    ) : (
                        <List>
                            {followers.map((item) => {
                                return (
                                    <ActivityItem key={item.id} url={item.url}>
                                        <APAvatar author={item} />
                                        <div>
                                            <div className='text-grey-600'>
                                                <span className='mr-1 font-bold text-black'>{item.name || item.preferredUsername || 'Unknown'}</span>
                                                <div className='text-sm'>{getUsername(item)}</div>
                                            </div>
                                        </div>
                                    </ActivityItem>
                                );
                            })}
                        </List>
                    )}
                </div>
            ),
            counter: followersCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    const attachments = (userProfile?.attachment || []);

    const [isExpanded, setisExpanded] = useState(false);

    const toggleExpand = () => {
        setisExpanded(!isExpanded);
    };

    const contentRef = useRef<HTMLDivElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > 160); // Compare content height to max height
        }
    }, [isExpanded]);

    return (
        <>
            <MainNavigation title='Profile' />
            <div className='z-0 mx-auto mt-8 flex w-full max-w-[580px] flex-col items-center pb-16'>
                <div className='mx-auto w-full'>
                    {userProfile?.image && (<div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                        <img
                            alt={userProfile?.name}
                            className='h-full w-full object-cover'
                            src={userProfile?.image.url}
                        />
                    </div>)}
                    <div className={`${userProfile?.image && '-mt-12'} px-4`}>
                        <div className='flex items-end justify-between'>
                            <div className='rounded-xl outline outline-4 outline-white'>
                                <APAvatar
                                    author={userProfile as ActorProperties}
                                    size='lg'
                                />
                            </div>
                        </div>
                        <Heading className='mt-4' level={3}>{userProfile?.name}</Heading>
                        <span className='mt-1 text-[1.5rem] text-grey-800'>
                            <span>{userProfile && getUsername(userProfile)}</span>
                        </span>
                        {(userProfile?.summary || attachments.length > 0) && (<div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                            <div
                                dangerouslySetInnerHTML={{__html: userProfile?.summary ?? ''}}
                                className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                            />
                            {attachments.map(attachment => (
                                <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                    <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                    <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                </span>
                            ))}
                            {!isExpanded && isOverflowing && (
                                <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 via-60% to-transparent' />
                            )}
                            {isOverflowing && <Button
                                className='absolute bottom-0 text-pink'
                                label={isExpanded ? 'Show less' : 'Show all'}
                                link={true}
                                onClick={toggleExpand}
                            />}
                        </div>)}
                        <TabView<ProfileTab>
                            containerClassName='mt-6'
                            selectedTab={selectedTab}
                            tabs={tabs}
                            onTabChange={setSelectedTab}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
