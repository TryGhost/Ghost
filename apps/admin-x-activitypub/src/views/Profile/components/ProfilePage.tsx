import APAvatar from '@src/components/global/APAvatar';
import EditProfile from '@src/views/Preferences/components/EditProfile';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@src/components/layout';
import ProfileMenu from './ProfileMenu';
import UnblockButton from './UnblockButton';
import {Account} from '@src/api/activitypub';
import {Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {Heading, Icon, NoValueLabel, Button as OldButton, Tab, TabView, showToast} from '@tryghost/admin-x-design-system';
import {ProfileTab} from '../Profile';
import {SettingAction} from '@src/views/Preferences/components/Settings';
import {useAccountForUser, useBlockDomainMutationForUser, useBlockMutationForUser, useUnblockDomainMutationForUser, useUnblockMutationForUser} from '@src/hooks/use-activity-pub-queries';
import {useEffect, useRef, useState} from 'react';
import {useNavigationStack, useParams} from '@tryghost/admin-x-framework';

const noop = () => {};

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
    const {canGoBack} = useNavigationStack();

    useEffect(() => {
        setSelectedTab('posts');
    }, [params.handle]);

    const blockMutation = useBlockMutationForUser('index');
    const unblockMutation = useUnblockMutationForUser('index');
    const blockDomainMutation = useBlockDomainMutationForUser('index');
    const unblockDomainMutation = useUnblockDomainMutationForUser('index');

    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = params.handle ? currentAccountQuery : {data: undefined};
    const isCurrentUser = params.handle === currentUser?.handle || !params.handle;

    const isBlocked = account?.blockedByMe;
    const isDomainBlocked = account?.domainBlockedByMe;
    const [viewBlockedPosts, setViewBlockedPosts] = useState(false);

    const handleBlock = () => {
        if (isBlocked) {
            unblockMutation.mutate(account);
        } else {
            blockMutation.mutate(account);
            showToast({
                title: 'User blocked',
                type: 'success'
            });
        }
        setViewBlockedPosts(false);
    };

    const handleDomainBlock = () => {
        if (isDomainBlocked) {
            unblockDomainMutation.mutate({url: account.apId, handle: account.handle});
        } else {
            blockDomainMutation.mutate({url: account.apId, handle: account.handle});
            showToast({
                title: 'Domain blocked',
                type: 'success'
            });
        }
        setViewBlockedPosts(false);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(account.handle);
        showToast({
            title: 'Handle copied',
            type: 'success'
        });
    };

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: ((isBlocked || isDomainBlocked) && !viewBlockedPosts) ?
                <NoValueLabel icon='block'>
                    <div className='mt-2 flex flex-col items-center gap-0.5'>
                        <H4>{account.name} is blocked</H4>
                        <p>You can view the posts, but it won&apos;t unblock the user.</p>
                        <Button className='mt-4' variant='secondary' onClick={() => setViewBlockedPosts(true)}>View posts</Button>
                    </div>
                </NoValueLabel> :
                postsTab
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
    const [isEditingProfile, setIsEditingProfile] = useState(false);

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
            <div className='z-0 -mx-8 -mt-9 flex flex-col items-center pb-16'>
                <div className='mx-auto w-full'>
                    {!isLoadingAccount && !account && (
                        <NoValueLabel icon='user-add'>
                        Profile not found
                        </NoValueLabel>
                    )}
                    <>
                        {account?.bannerImageUrl ?
                            <div className='h-[15vw] min-h-[200px] w-full overflow-hidden bg-gradient-to-tr from-gray-200 to-gray-100'>
                                <img
                                    alt={account?.name}
                                    className='size-full object-cover'
                                    src={account?.bannerImageUrl}
                                />
                            </div>
                            :
                            <div className='h-[8vw] w-full overflow-hidden bg-gradient-to-tr from-white to-white dark:from-black dark:to-black'></div>
                        }
                        <div className={`mx-auto max-w-[620px] px-6 ${(!account?.bannerImageUrl && !canGoBack) ? '-mt-8' : '-mt-12'}`}>
                            <div className='flex items-end justify-between'>
                                <div className='-ml-2 rounded-full bg-white p-1 dark:bg-black'>
                                    {isLoadingAccount ?
                                        <Skeleton className='size-[92px] rounded-full' />
                                        :
                                        <APAvatar
                                            author={
                                                {
                                                    icon: {
                                                        url: account?.avatarUrl
                                                    },
                                                    name: account?.name,
                                                    handle: account?.handle
                                                }
                                            }
                                            size='lg'
                                        />
                                    }
                                </div>
                                {!isCurrentUser && !isLoadingAccount &&
                                    <div className='flex gap-2'>
                                        {!(isBlocked || isDomainBlocked) ?
                                            <FollowButton
                                                following={account?.followedByMe}
                                                handle={account?.handle}
                                                type='primary'
                                                onFollow={noop}
                                                onUnfollow={noop}
                                            /> :
                                            <UnblockButton
                                                account={account}
                                                onDomainUnblock={handleDomainBlock}
                                                onUnblock={handleBlock}
                                            />
                                        }
                                        <ProfileMenu
                                            account={account}
                                            isBlocked={isBlocked}
                                            isDomainBlocked={isDomainBlocked}
                                            onBlockAccount={handleBlock}
                                            onBlockDomain={handleDomainBlock}
                                            onCopyHandle={handleCopy}
                                        >
                                            <Button aria-label='Open profile menu' variant='outline'><LucideIcon.Ellipsis /></Button>
                                        </ProfileMenu>
                                    </div>
                                }
                                {isCurrentUser && !isLoadingAccount &&
                                    <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                                        <DialogTrigger>
                                            <SettingAction><Button variant='secondary'>Edit profile</Button></SettingAction>
                                        </DialogTrigger>
                                        <DialogContent className='w-full max-w-[520px]' onOpenAutoFocus={e => e.preventDefault()}>
                                            <DialogHeader>
                                                <DialogTitle>Profile settings</DialogTitle>
                                            </DialogHeader>
                                            {account && <EditProfile account={account} setIsEditingProfile={setIsEditingProfile} />}
                                        </DialogContent>
                                    </Dialog>
                                }
                            </div>
                            <Heading className='mt-4 truncate break-anywhere' level={3}>{!isLoadingAccount ? account?.name : <Skeleton className='w-32' />}</Heading>
                            <a className='group/handle mb-4 inline-flex max-w-full items-center gap-1 text-[1.5rem] text-gray-800 break-anywhere hover:text-gray-900' href={account?.url} rel='noopener noreferrer' target='_blank'>
                                <span className='truncate'>{!isLoadingAccount ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
                                <Icon className='opacity-0 transition-opacity group-hover/handle:opacity-100' name='arrow-top-right' size='xs'/>
                            </a>
                            {(account?.bio || customFields?.length > 0) && (<div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out break-anywhere [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                {!isLoadingAccount ?
                                    <div dangerouslySetInnerHTML={{__html: account?.bio ?? ''}} /> :
                                    <>
                                        <Skeleton />
                                        <Skeleton className='w-full max-w-48' />
                                    </>
                                }
                                {customFields?.map((attachment: {name: string, value: string}) => (
                                    <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                        <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                        <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                    </span>
                                ))}
                                {!isExpanded && isOverflowing && (
                                    <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 via-60% to-transparent' />
                                )}
                                {isOverflowing && <OldButton
                                    className='absolute bottom-0'
                                    label={isExpanded ? 'Show less' : 'Show all'}
                                    link={true}
                                    size='sm'
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
                    </>
                </div>
            </div>
        </Layout>
    );
};

export default ProfilePage;
