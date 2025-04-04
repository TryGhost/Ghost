import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import clsx from 'clsx';
import useQueryParams from '../../../hooks/useQueryParams';
import useStaffUsers from '../../../hooks/useStaffUsers';
import {Avatar, Button, List, ListItem, NoValueLabel, Separator, TabView, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {User, hasAdminAccess, isContributorUser, isEditorUser} from '@tryghost/admin-x-framework/api/users';
import {UserInvite, useAddInvite, useDeleteInvite} from '@tryghost/admin-x-framework/api/invites';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
            <Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image ?? undefined} label={getInitials(user.name)} labelColor='white' size='lg' />
            <div className='flex flex-col'>
                <span>{user.name} &mdash; <strong>Owner</strong> {hasAdminAccess(currentUser) && <button className='ml-2 inline-block text-sm font-bold text-green group-hover:visible md:invisible' type='button'>View profile</button>}</span>
                <span className='text-xs text-grey-700'>{user.email}</span>
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
            <NoValueLabel icon='single-user-block'>
                No {groupname} found.
            </NoValueLabel>
        );
    }

    return (
        <List titleSeparator={false}>
            {users.map((user) => {
                let title = user.name || '';
                if (user.status === 'inactive') {
                    title = `${title} (Suspended)`;
                }

                const canEdit = hasAdminAccess(currentUser) ||
                    (isEditorUser(currentUser) && isContributorUser(user)) ||
                    currentUser.id === user.id;

                return (
                    <ListItem
                        key={user.id}
                        action={canEdit && <Button color='green' label='Edit' link={true} onClick={() => showDetailModal(user)}/>}
                        avatar={(<Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image ?? undefined} label={getInitials(user.name)} labelColor='white' />)}
                        bgOnHover={canEdit}
                        className='min-h-[64px]'
                        detail={user.email}
                        hideActions={true}
                        id={`list-item-${user.id}`}
                        separator={false}
                        testId='user-list-item'
                        title={title}
                        onClick={() => canEdit && showDetailModal(user)} />
                );
            })}
        </List>
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
                color='red'
                label={revokeActionLabel}
                link={true}
                onClick={async () => {
                    try {
                        setRevokeState('progress');
                        await deleteInvite(invite.id);
                        showToast({
                            title: `Invitation revoked`,
                            message: invite.email,
                            type: 'success'
                        });
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setRevokeState('');
                    }
                }}
            />
            <Button
                className='ml-2'
                color='green'
                label={resendActionLabel}
                link={true}
                onClick={async () => {
                    try {
                        setResendState('progress');
                        await deleteInvite(invite.id);
                        await addInvite({
                            email: invite.email,
                            roleId: invite.role_id
                        });
                        showToast({
                            title: `Invitation resent`,
                            message: invite.email,
                            type: 'success'
                        });
                    } catch (e) {
                        handleError(e);
                    } finally {
                        setResendState('');
                    }
                }}
            />
        </div>
    );
};

const InvitesUserList: React.FC<InviteListProps> = ({users}) => {
    if (!users || !users.length) {
        return (
            <NoValueLabel icon='single-user-block'>
                No invitations found.
            </NoValueLabel>
        );
    }

    return (
        <List>
            {users.map((user) => {
                return (
                    <ListItem
                        key={user.id}
                        action={<UserInviteActions invite={user} />}
                        avatar={(<Avatar bgColor={generateAvatarColor((user.email))} image={''} label={user.email.charAt(0).toUpperCase()} labelColor='white' />)}
                        className='min-h-[64px]'
                        detail={user.role}
                        hideActions={true}
                        id={`list-item-${user.id}`}
                        separator={false}
                        testId='user-invite'
                        title={user.email}
                        onClick={() => {
                            // do nothing
                        }}
                    />
                );
            })}
        </List>
    );
};

const Users: React.FC<{ keywords: string[], highlight?: boolean }> = ({keywords, highlight = true}) => {
    const {
        totalUsers,
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        invites,
        hasNextPage,
        fetchNextPage
    } = useStaffUsers();
    const {updateRoute} = useRouting();
    const {currentUser} = useGlobalData();

    const showInviteModal = () => {
        updateRoute('staff/invite');
    };

    const buttons = (
        <Button className='mt-[-5px]' color='clear' label='Invite people' size='sm' linkWithPadding onClick={() => {
            showInviteModal();
        }} />
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

    const tabs = [
        {
            id: 'administrators',
            title: 'Administrators',
            contents: (<UsersList groupname='administrators' users={adminUsers} />),
            counter: adminUsers.length ? adminUsers.length : undefined
        },
        {
            id: 'editors',
            title: 'Editors',
            contents: (<UsersList groupname='editors' users={editorUsers} />),
            counter: editorUsers.length ? editorUsers.length : undefined
        },
        {
            id: 'authors',
            title: 'Authors',
            contents: (<UsersList groupname='authors' users={authorUsers} />),
            counter: authorUsers.length ? authorUsers.length : undefined
        },
        {
            id: 'contributors',
            title: 'Contributors',
            contents: (<UsersList groupname='contributors' users={contributorUsers} />),
            counter: contributorUsers.length ? contributorUsers.length : undefined
        },
        {
            id: 'invited',
            title: 'Invited',
            contents: (<InvitesUserList users={invites} />),
            counter: invites.length ? invites.length : undefined
        }
    ];

    const {settings} = useGlobalData();
    const require2fa = getSettingValue<boolean>(settings, 'require_email_mfa') || false;
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
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
            {/* if there are no users besides the owner user, hide the tabs*/}
            {(users.length > 1 || invites.length > 0) && <TabView selectedTab={selectedTab} tabs={tabs} testId='user-tabview' onTabChange={updateSelectedTab} />}
            {hasNextPage && <Button
                label={`Load more (showing ${users.length}/${totalUsers} users)`}
                link
                onClick={() => fetchNextPage()}
            />}
            {labs.staff2fa && !isEditorUser(currentUser) && (
                <div className={`flex flex-col gap-6 ${users.length > 1 || invites.length > 0 ? '-mt-6' : ''}`}>
                    <Separator />
                    <div className='flex items-baseline justify-between'>
                        <div className='flex flex-col'>
                            <span className='text-[1.5rem] font-semibold tracking-tight'>Security settings</span>
                            <span>Require email 2FA codes to be used on all staff logins</span>
                        </div>
                        <Toggle
                            checked={require2fa}
                            direction='rtl'
                            gap='gap-0'
                            onChange={async () => {
                                const newValue = !require2fa;
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
