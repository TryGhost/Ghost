import APAvatar from '@src/components/global/APAvatar';
import Layout from '@src/components/layout';
import {Account} from '@src/api/activitypub';
import {Button, Heading, Tab, TabView} from '@tryghost/admin-x-design-system';
import {ProfileTab} from '../Profile';
import {Skeleton} from '@tryghost/shade';
import {useEffect, useRef, useState} from 'react';
import {useParams} from '@tryghost/admin-x-framework';

type ProfilePageProps = {
    account: Account,
    customFields: Array<{
        name: string;
        value: string;
    }>,
    postsTab: React.ReactNode,
    likesTab: React.ReactNode,
    followingTab: React.ReactNode,
    followersTab: React.ReactNode,
    isLoadingAccount: boolean
}

const ProfilePage:React.FC<ProfilePageProps> = ({
    account,
    customFields,
    isLoadingAccount,
    postsTab,
    likesTab,
    followingTab,
    followersTab
}) => {
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
    const params = useParams();

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: postsTab
        },
        !params.handle && {
            id: 'likes',
            title: 'Likes',
            contents: likesTab,
            counter: account?.likedCount || 0
        },
        {
            id: 'following',
            title: 'Following',
            contents: followingTab,
            counter: account?.followingCount || '0'
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: followersTab,
            counter: account?.followerCount || '0'
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

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
        <Layout>
            <div className='relative isolate'>
                <div className='absolute -right-8 left-0 top-0 z-0 h-[5vw]'>
                    {account?.bannerImageUrl &&
                    <div className='size-full'>
                        <img
                            alt={account?.name}
                            className='size-full object-cover'
                            src={account?.bannerImageUrl}
                        />
                    </div>
                    }
                </div>
                <div className='relative z-10 mx-auto flex w-full max-w-[620px] flex-col items-center pb-16 pt-[calc(5vw-52px)]'>
                    <div className='mx-auto w-full'>
                        <div>
                            <div className='flex items-end justify-between'>
                                <div className='-ml-2 rounded-full bg-white p-1 dark:bg-black dark:outline-black'>
                                    <APAvatar
                                        author={account && {
                                            icon: {
                                                url: account?.avatarUrl
                                            },
                                            name: account?.name,
                                            handle: account?.handle
                                        }}
                                        size='lg'
                                    />
                                </div>
                            </div>
                            <Heading className='mt-4' level={3}>{!isLoadingAccount ? account?.name : <Skeleton className='w-32' />}</Heading>
                            <span className='mt-1 text-[1.5rem] text-gray-700 dark:text-gray-600'>
                                <span>{!isLoadingAccount ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
                            </span>
                            {(account?.bio || customFields.length > 0 || isLoadingAccount) && (
                                <div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                    <div className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'>
                                        {!isLoadingAccount ?
                                            <div dangerouslySetInnerHTML={{__html: account?.bio ?? ''}} /> :
                                            <>
                                                <Skeleton />
                                                <Skeleton className='w-full max-w-48' />
                                            </>
                                        }
                                    </div>
                                    {customFields.map(customField => (
                                        <span key={customField.name} className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                            <span className={`text-xs font-semibold`}>{customField.name}</span>
                                            <span dangerouslySetInnerHTML={{__html: customField.value}} className='ap-profile-content truncate'/>
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
                                </div>
                            )}
                            <TabView<ProfileTab>
                                containerClassName='mt-6'
                                selectedTab={selectedTab}
                                tabs={tabs}
                                onTabChange={setSelectedTab}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ProfilePage;
