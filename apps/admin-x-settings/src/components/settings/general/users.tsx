import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import clsx from 'clsx';
import useQueryParams from '../../../hooks/use-query-params';
import useStaffUsers from '../../../hooks/use-staff-users';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Avatar, NoValueLabel, NoValueLabelIcon, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger, TabsTriggerCount} from '@tryghost/shade/components';
import {Button} from '@tryghost/shade/components';
import {type User, hasAdminAccess, isContributorUser, isEditorUser} from '@tryghost/admin-x-framework/api/users';
import {type UserInvite, useAddInvite, useDeleteInvite} from '@tryghost/admin-x-framework/api/invites';
import {UserRoundX} from 'lucide-react';
import {formatNumber} from '@tryghost/shade/utils';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

interface OwnerProps {
    user: User;
    updateUser?: (user: User) => void;
}

interface UsersListProps {
    users: User[];
    groupname?: string;
    updateUser?: (user: User) => void;
}

interface InviteListProps {
    users: UserInvite[];
    updateUser?: (user: User) => void;
}

const Owner: React.FC<OwnerProps> = ({user}) => {
    const {updateRoute} = useRouting();
    const {currentUser} = useGlobalData();

    const showDetailModal = () => {
        if (hasAdminAccess(currentUser)) {
            updateRoute({route: `staff/${user.slug}`});
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className={clsx('group flex gap-3', hasAdminAccess(currentUser) && 'cursor-pointer')} data-testid='owner-user' onClick={showDetailModal}>
            <Avatar className='size-12' email={user.email} name={user.name} src={user.profile_image} />
            <div className='flex flex-col'>
                <span>{user.name} &mdash; <strong>Owner</strong> {hasAdminAccess(currentUser) && <Button className='ml-2 h-auto p-0 text-green group-hover:visible hover:text-green md:invisible' type='button' variant='link' onClick={(event) => {
                    event.stopPropagation();
                    showDetailModal();
                }}>View profile</Button>}</span>
                <span className='text-sm text-grey-700'>{user.email}</span>
            </div>
        </div>
    );
};

const UsersList: React.FC<UsersListProps> = ({users, groupname}) => {
    const {updateRoute} = useRouting();
    const {currentUser} = useGlobalData();

    const showDetailModal = (user: User) => {
        updateRoute({route: `staff/${user.slug}`});
    };

    if (!users || !users.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><UserRoundX /></NoValueLabelIcon>
                No {groupname} found.
            </NoValueLabel>
        );
    }

    return (
        <ActionList>
            {users.map((user) => {
                let title = user.name || '';
                if (user.status === 'inactive') {
                    title = `${title} (Suspended)`;
                }

                const canEdit = hasAdminAccess(currentUser) ||
                    (isEditorUser(currentUser) && isContributorUser(user)) ||
                    currentUser.id === user.id;

                return (
                    <ActionListItem key={user.id} className='min-h-16' data-testid='user-list-item' hover={canEdit}>
                        <ActionListItemContent asChild>
                            {canEdit ? (
                                <button className='flex w-full items-center gap-3 py-3 text-left' id={`list-item-${user.id}`} type='button' onClick={() => showDetailModal(user)}>
                                    <Avatar className='size-10' email={user.email} name={user.name} src={user.profile_image} />
                                    <span className='min-w-0 grow'>
                                        <span className='block'>{title}</span>
                                        <span className='block truncate text-sm text-muted-foreground'>{user.email}</span>
                                    </span>
                                </button>
                            ) : (
                                <div className='flex w-full items-center gap-3 py-3' id={`list-item-${user.id}`}>
                                    <Avatar className='size-10' email={user.email} name={user.name} src={user.profile_image} />
                                    <span className='min-w-0 grow'>
                                        <span className='block'>{title}</span>
                                        <span className='block truncate text-sm text-muted-foreground'>{user.email}</span>
                                    </span>
                                </div>
                            )}
                        </ActionListItemContent>
                        {canEdit && <ActionListItemActions visibility='hover'><Button className='h-auto p-0 font-bold text-green hover:text-green/90 hover:no-underline' size='sm' type='button' variant='link' onClick={() => showDetailModal(user)}>Edit</Button></ActionListItemActions>}
                    </ActionListItem>
                );
            })}
        </ActionList>
    );
};

const UserInviteActions: React.FC<{invite: UserInvite}> = ({invite}) => {
    const [revokeState, setRevokeState] = useState<'progress'|''>('');
    const [resendState, setResendState] = useState<'progress'|''>('');

    const {mutateAsync: deleteInvite} = useDeleteInvite();
    const {mutateAsync: addInvite} = useAddInvite();
    const handleError = useHandleError();

    let revokeActionLabel = 'Revoke';
    if (revokeState === 'progress') {
        revokeActionLabel = 'Revoking...';
    }
    let resendActionLabel = 'Resend';
    if (resendState === 'progress') {
        resendActionLabel = 'Resending...';
    }
    return (
        <div className='flex gap-2'>
            <Button
                className='text-destructive hover:text-destructive'
                disabled={revokeState === 'progress'}
                size='sm'
                type='button'
                variant='ghost'
                onClick={async () => {
                    try {
                        setRevokeState('progress');
                        await deleteInvite(invite.id);
                        toast.success(`Invitation revoked`, {description: invite.email});
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setRevokeState('');
                    }
                }}
            >{revokeActionLabel}</Button>
            <Button
                className='ml-2'
                disabled={resendState === 'progress'}
                size='sm'
                type='button'
                variant='ghost'
                onClick={async () => {
                    try {
                        setResendState('progress');
                        await deleteInvite(invite.id);
                        await addInvite({
                            email: invite.email,
                            roleId: invite.role_id
                        });
                        toast.success(`Invitation resent`, {description: invite.email});
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setResendState('');
                    }
                }}
            >{resendActionLabel}</Button>
        </div>
    );
};

const InvitesUserList: React.FC<InviteListProps> = ({users}) => {
    if (!users || !users.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><UserRoundX /></NoValueLabelIcon>
                No invitations found.
            </NoValueLabel>
        );
    }

    return (
        <ActionList>
            {users.map((user) => {
                return (
                    <ActionListItem key={user.id} className='min-h-16' data-testid='user-invite' hover={false}>
                        <ActionListItemContent className='flex items-center gap-3 py-3' id={`list-item-${user.id}`}>
                            <Avatar className='size-10' email={user.email} />
                            <span className='min-w-0 grow'>
                                <span className='block'>{user.email}</span>
                                <span className='block text-sm text-muted-foreground'>{user.role}</span>
                            </span>
                        </ActionListItemContent>
                        <ActionListItemActions><UserInviteActions invite={user} /></ActionListItemActions>
                    </ActionListItem>
                );
            })}
        </ActionList>
    );
};

const Users: React.FC<{ keywords: string[], highlight?: boolean }> = ({keywords, highlight = true}) => {
    const {
        totalUsers,
        totalInvites,
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        invites,
        hasNextPage,
        fetchNextPage,
        invitesHasNextPage,
        fetchNextInvitePage
    } = useStaffUsers();
    const {updateRoute} = useRouting();
    const {settings, config, currentUser} = useGlobalData();

    const showInviteModal = () => {
        updateRoute('staff/invite');
    };

    const buttons = (
        <Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={() => {
            showInviteModal();
        }}>Invite people</Button>
    );

    const tabParam = useQueryParams().getParam('tab');
    const defaultTab = tabParam || 'administrators';
    const [selectedTab, setSelectedTab] = useState(defaultTab);

    useEffect(() => {
        if (tabParam) {
            setSelectedTab(tabParam);
        }
    }, [tabParam]);

    const updateSelectedTab = (newTab: string) => {
        updateRoute(`staff?tab=${newTab}`);
        setSelectedTab(newTab);
    };

    const require2fa = getSettingValue<boolean>(settings, 'require_email_mfa') || false;
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return (
        <TopLevelGroup
            customButtons={buttons}
            highlightOnModalClose={highlight}
            keywords={keywords}
            navid='staff'
            testId='users'
            title='Staff'
        >
            <Owner user={ownerUser} />
            {(users.length > 1 || invites.length > 0) && (
                <Tabs data-testid='user-tabview' value={selectedTab} variant='underline' onValueChange={updateSelectedTab}>
                    <TabsList>
                        <TabsTrigger value='administrators'>Administrators{adminUsers.length > 0 && <TabsTriggerCount>{formatNumber(adminUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value='editors'>Editors{editorUsers.length > 0 && <TabsTriggerCount>{formatNumber(editorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value='authors'>Authors{authorUsers.length > 0 && <TabsTriggerCount>{formatNumber(authorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value='contributors'>Contributors{contributorUsers.length > 0 && <TabsTriggerCount>{formatNumber(contributorUsers.length)}</TabsTriggerCount>}</TabsTrigger>
                        <TabsTrigger value='invited'>Invited{totalInvites > 0 && <TabsTriggerCount>{formatNumber(totalInvites)}</TabsTriggerCount>}</TabsTrigger>
                    </TabsList>
                    <TabsContent value='administrators'><UsersList groupname='administrators' users={adminUsers} /></TabsContent>
                    <TabsContent value='editors'><UsersList groupname='editors' users={editorUsers} /></TabsContent>
                    <TabsContent value='authors'><UsersList groupname='authors' users={authorUsers} /></TabsContent>
                    <TabsContent value='contributors'><UsersList groupname='contributors' users={contributorUsers} /></TabsContent>
                    <TabsContent value='invited'><InvitesUserList users={invites} /></TabsContent>
                </Tabs>
            )}

            {hasNextPage && selectedTab !== 'invited' && <Button
                type='button'
                variant='link'
                onClick={() => fetchNextPage()}
            >{`Load more (showing ${formatNumber(users.length)}/${formatNumber(totalUsers)} users)`}</Button>}
            {invitesHasNextPage && selectedTab === 'invited' && <Button
                type='button'
                variant='link'
                onClick={() => fetchNextInvitePage()}
            >{`Load more (showing ${formatNumber(invites.length)}/${formatNumber(totalInvites)} invites)`}</Button>}

            {config?.security?.staffDeviceVerification && hasAdminAccess(currentUser) && (
                <div className={`flex flex-col gap-6 ${users.length > 1 || invites.length > 0 ? '-mt-6' : ''}`}>
                    <Separator />
                    <div className='flex items-baseline justify-between'>
                        <div className='flex flex-col'>
                            <span className='text-[1.5rem] font-semibold tracking-tight'>Security settings</span>
                            <span>Require email 2FA codes to be used on all staff logins</span>
                        </div>
                        <Switch
                            aria-label='Require email 2FA codes on staff logins'
                            checked={require2fa}
                            onCheckedChange={async (newValue) => {
                                try {
                                    await editSettings([{
                                        key: 'require_email_mfa',
                                        value: newValue
                                    }]);
                                } catch (error) {
                                    handleError(error);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Users, 'Staff');
