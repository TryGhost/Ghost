import APAvatar from '@src/components/global/APAvatar';
import EditProfile from '@src/views/Preferences/components/EditProfile';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@src/components/layout';
import ProfileMenu from './ProfileMenu';
import UnblockButton from './UnblockButton';
import {Account} from '@src/api/activitypub';
import {Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, H2, H4, LucideIcon, NoValueLabel, NoValueLabelIcon, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, TabsTriggerCount} from '@tryghost/shade';
import {SettingAction} from '@src/views/Preferences/components/Settings';
import {toast} from 'sonner';
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
    const params = useParams();
    const {canGoBack} = useNavigationStack();

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
            toast.success('User blocked');
        }
        setViewBlockedPosts(false);
    };

    const handleDomainBlock = () => {
        if (isDomainBlocked) {
            unblockDomainMutation.mutate({url: account.apId, handle: account.handle});
        } else {
            blockDomainMutation.mutate({url: account.apId, handle: account.handle});
            toast.success('Domain blocked');
        }
        setViewBlockedPosts(false);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(account.handle);
        toast.success('Handle copied');
    };

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
                        <NoValueLabel>
                            <NoValueLabelIcon><LucideIcon.UserRoundPlus /></NoValueLabelIcon>
                            Profile not found
                        </NoValueLabel>
                    )}
                    <>
                        {account?.bannerImageUrl ?
                            <div className='h-[15vw] min-h-[200px] w-full overflow-hidden bg-gradient-to-tr from-gray-200 to-gray-100'>
                                <img
                                    alt={account?.name}
                                    className='size-full object-cover'
                                    referrerPolicy='no-referrer'
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
                            <H2 className='mt-4 truncate break-anywhere'>{!isLoadingAccount ? account?.name : <Skeleton className='w-32' />}</H2>
                            <div className='mb-4 flex items-center gap-2'>
                                <a className='inline-flex max-w-full truncate text-[1.5rem] text-gray-800 hover:text-gray-900' href={account?.url} rel='noopener noreferrer' target='_blank'>
                                    <span className='truncate'>{!isLoadingAccount ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
                                </a>
                                {account?.followsMe && !isLoadingAccount && (
                                    <Badge className='mt-px whitespace-nowrap' variant='secondary'>Follows you</Badge>
                                )}
                            </div>
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
                                {isOverflowing && <Button
                                    className='absolute bottom-0 h-auto p-0'
                                    variant='link'
                                    onClick={toggleExpand}
                                >{isExpanded ? 'Show less' : 'Show all'}</Button>}
                            </div>)}
                            <Tabs className='mt-5' defaultValue='posts' variant='underline'>
                                <TabsList>
                                    <TabsTrigger value="posts">Posts</TabsTrigger>
                                    {!params.handle && <TabsTrigger value="likes">
                                        Likes
                                        <TabsTriggerCount>{account?.likedCount || 0}</TabsTriggerCount>
                                    </TabsTrigger>}
                                    <TabsTrigger value="following">
                                        Following
                                        <TabsTriggerCount>{account?.followingCount || 0}</TabsTriggerCount>
                                    </TabsTrigger>
                                    <TabsTrigger value="followers">
                                        Followers
                                        <TabsTriggerCount>{account?.followerCount || 0}</TabsTriggerCount>
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value='posts'>
                                    {((isBlocked || isDomainBlocked) && !viewBlockedPosts) ?
                                        <NoValueLabel>
                                            <NoValueLabelIcon><LucideIcon.Ban /></NoValueLabelIcon>
                                            <div className='mt-2 flex flex-col items-center gap-0.5'>
                                                <H4>{account.name} is blocked</H4>
                                                <p>You can view the posts, but it won&apos;t unblock the user.</p>
                                                <Button className='mt-4' variant='secondary' onClick={() => setViewBlockedPosts(true)}>View posts</Button>
                                            </div>
                                        </NoValueLabel> :
                                        postsTab
                                    }
                                </TabsContent>
                                {!params.handle && <TabsContent value='likes'>
                                    {likesTab}
                                </TabsContent>}
                                <TabsContent value='following'>
                                    {followingTab}
                                </TabsContent>
                                <TabsContent value='followers'>
                                    {followersTab}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </>
                </div>
            </div>
        </Layout>
    );
};

export default ProfilePage;
