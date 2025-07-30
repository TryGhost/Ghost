import APAvatar from '@src/components/global/APAvatar';
import ActivityItem from '@src/components/activities/ActivityItem';
import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {Account} from '@src/api/activitypub';
import {Button, H2, LucideIcon, NoValueLabel, NoValueLabelIcon, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';
import {handleProfileClick} from '@src/utils/handle-profile-click';
import {toast} from 'sonner';
import {useBlockDomainMutationForUser, useBlockMutationForUser, useBlockedAccountsForUser, useBlockedDomainsForUser, useUnblockDomainMutationForUser, useUnblockMutationForUser} from '@hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';

const Moderation: React.FC = () => {
    const {data: blockedAccountsData, isLoading: blockedAccountsLoading} = useBlockedAccountsForUser('index');
    const {data: blockedDomainsData, isLoading: blockedDomainsLoading} = useBlockedDomainsForUser('index');

    const blockedAccounts = blockedAccountsLoading
        ? Array(5).fill({apId: '', name: '', handle: '', avatarUrl: ''})
        : blockedAccountsData?.pages.flatMap(page => page.accounts) ?? [];
    const blockedDomains = blockedDomainsLoading
        ? Array(5).fill({apId: '', name: ''})
        : blockedDomainsData?.pages.flatMap(page => page.domains) ?? [];

    const blockMutation = useBlockMutationForUser('index');
    const unblockMutation = useUnblockMutationForUser('index');
    const [unblockedAccountIds, setUnblockedAccountIds] = useState<Set<string>>(new Set());

    const blockDomainMutation = useBlockDomainMutationForUser('index');
    const unblockDomainMutation = useUnblockDomainMutationForUser('index');
    const [unblockedDomainIds, setUnblockedDomainIds] = useState<Set<string>>(new Set());

    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleUnblock = (account: Account) => {
        setUnblockedAccountIds((prev) => {
            const newSet = new Set([...prev]);
            newSet.add(account.apId);
            return newSet;
        });

        unblockMutation.mutate(account);

        toast.success('User unblocked');
    };

    const handleBlock = (account: Account) => {
        setUnblockedAccountIds((prev) => {
            const newSet = new Set([...prev]);
            newSet.delete(account.apId);
            return newSet;
        });

        blockMutation.mutate(account);

        toast.success('User blocked');
    };

    const handleDomainUnblock = (domain: {url: string}) => {
        setUnblockedDomainIds((prev) => {
            const newSet = new Set([...prev]);
            newSet.add(domain.url);
            return newSet;
        });

        unblockDomainMutation.mutate({url: domain.url});

        toast.success('Domain unblocked');
    };

    const handleDomainBlock = (domain: {url: string}) => {
        setUnblockedDomainIds((prev) => {
            const newSet = new Set([...prev]);
            newSet.delete(domain.url);
            return newSet;
        });

        blockDomainMutation.mutate({url: domain.url});

        toast.success('Domain blocked');
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                <div className='flex items-center justify-between gap-8'>
                    <H2>Moderation</H2>
                </div>
                <div className='mt-6'>
                    <Tabs defaultValue="blocked_users" variant='underline'>
                        <TabsList>
                            <TabsTrigger value="blocked_users">Blocked users</TabsTrigger>
                            <TabsTrigger value="blocked_domains">Blocked domains</TabsTrigger>
                        </TabsList>
                        <TabsContent className='mt-2' value="blocked_users">
                            {!blockedAccountsLoading && blockedAccounts.length === 0 ? (
                                <NoValueLabel>
                                    <NoValueLabelIcon><LucideIcon.Ban /></NoValueLabelIcon>
                                    <div className='mt-2 flex max-w-[400px] flex-col items-center gap-1 text-center'>
                                        <p>When you block someone, they won&apos;t be able to follow you or interact with your content on the social web.</p>
                                    </div>
                                </NoValueLabel>
                            ) : (
                                blockedAccounts.map((account, index) => (
                                    <ActivityItem
                                        key={account.apId ? account.apId : `loading-${index}`}
                                        onClick={!blockedAccountsLoading ? () => handleProfileClick(account.handle, navigate) : undefined}
                                    >
                                        <APAvatar
                                            author={
                                                {
                                                    icon: {
                                                        url: account.avatarUrl
                                                    },
                                                    name: account.name,
                                                    handle: account.handle
                                                }
                                            } />
                                        <div className='flex min-w-0  flex-col'>
                                            <span className='block truncate font-semibold text-black dark:text-white'>{!blockedAccountsLoading ? account.name : <Skeleton className='w-24' />}</span>
                                            <span className='block truncate text-sm text-gray-600'>{!blockedAccountsLoading ? account.handle : <Skeleton className='w-40' />}</span>
                                        </div>

                                        {unblockedAccountIds.has(account.apId) ? (
                                            <Button
                                                className='ml-auto min-w-[90px] text-red hover:!bg-red/5 hover:text-red-400'
                                                variant='outline'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBlock(account);
                                                }}
                                            >
                                                Block
                                            </Button>
                                        ) : (
                                            !blockedAccountsLoading ?
                                                <Button
                                                    className='ml-auto min-w-[90px]'
                                                    variant='destructive'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUnblock(account);
                                                    }}
                                                    onMouseEnter={() => setHoveredItemId(account.apId)}
                                                    onMouseLeave={() => setHoveredItemId(null)}
                                                >
                                                    {hoveredItemId === account.apId ? 'Unblock' : 'Blocked'}
                                                </Button> :
                                                <div className='ml-auto w-16'>
                                                    <Skeleton />
                                                </div>
                                        )}
                                    </ActivityItem>
                                ))
                            )}
                        </TabsContent>
                        <TabsContent className='mt-[11px]' value="blocked_domains">
                            {!blockedDomainsLoading && blockedDomains.length === 0 ? (
                                <NoValueLabel>
                                    <NoValueLabelIcon><LucideIcon.Ban /></NoValueLabelIcon>
                                    <div className='mt-2 flex max-w-[400px] flex-col items-center gap-1 text-center'>
                                        <p>When you block a domain, all users from that domain won&apos;t be able to follow you or interact with your content.</p>
                                    </div>
                                </NoValueLabel>
                            ) : (
                                blockedDomains.map((domain, index) => (
                                    <ActivityItem key={domain.url ? domain.url : `loading-${index}`}>
                                        <div className='flex min-w-0 flex-col'>
                                            <span className='block truncate font-semibold text-black dark:text-white'>
                                                {!blockedDomainsLoading ? new URL(domain.url).hostname : <Skeleton className='w-48' />}
                                            </span>
                                        </div>

                                        {unblockedDomainIds.has(domain.url) ? (
                                            <Button
                                                className='ml-auto min-w-[90px] text-red hover:!bg-red/5 hover:text-red-400'
                                                variant='outline'
                                                onClick={() => handleDomainBlock(domain)}
                                            >
                                                Block
                                            </Button>
                                        ) : (
                                            !blockedDomainsLoading ?
                                                <Button
                                                    className='ml-auto min-w-[90px]'
                                                    variant='destructive'
                                                    onClick={() => handleDomainUnblock(domain)}
                                                    onMouseEnter={() => setHoveredItemId(domain.url)}
                                                    onMouseLeave={() => setHoveredItemId(null)}
                                                >
                                                    {hoveredItemId === domain.url ? 'Unblock' : 'Blocked'}
                                                </Button> :
                                                <div className='ml-auto w-16'>
                                                    <Skeleton />
                                                </div>
                                        )}
                                    </ActivityItem>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </Layout>
    );
};

export default Moderation;
