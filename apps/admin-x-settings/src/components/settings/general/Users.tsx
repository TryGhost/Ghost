import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NoValueLabel from '../../../admin-x-ds/global/NoValueLabel';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import clsx from 'clsx';
import useHandleError from '../../../utils/api/handleError';
import useRouting from '../../../hooks/useRouting';
import useStaffUsers from '../../../hooks/useStaffUsers';
import {User, hasAdminAccess, isContributorUser, isEditorUser} from '../../../api/users';
import {UserInvite, useAddInvite, useDeleteInvite} from '../../../api/invites';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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
            <Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image} label={getInitials(user.name)} labelColor='white' size='lg' />
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
                        avatar={(<Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image} label={getInitials(user.name)} labelColor='white' />)}
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
                            message: `Invitation revoked (${invite.email})`,
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
                            message: `Invitation resent! (${invite.email})`,
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
                        avatar={(<Avatar bgColor={generateAvatarColor((user.email))} image={''} label={''} labelColor='white' />)}
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

    const showInviteModal = () => {
        updateRoute('staff/invite');
    };

    const buttons = (
        <Button color='green' label='Invite people' link={true} linkWithPadding onClick={() => {
            showInviteModal();
        }} />
    );

    const [selectedTab, setSelectedTab] = useState('users-admins');

    const tabs = [
        {
            id: 'users-admins',
            title: 'Administrators',
            contents: (<UsersList groupname='administrators' users={adminUsers} />)
        },
        {
            id: 'users-editors',
            title: 'Editors',
            contents: (<UsersList groupname='editors' users={editorUsers} />)
        },
        {
            id: 'users-authors',
            title: 'Authors',
            contents: (<UsersList groupname='authors' users={authorUsers} />)
        },
        {
            id: 'users-contributors',
            title: 'Contributors',
            contents: (<UsersList groupname='contributors' users={contributorUsers} />)
        },
        {
            id: 'users-invited',
            title: 'Invited',
            contents: (<InvitesUserList users={invites} />)
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
            highlightOnModalClose={highlight}
            keywords={keywords}
            navid='staff'
            testId='users'
            title='Staff'
        >
            <Owner user={ownerUser} />
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
            {hasNextPage && <Button
                label={`Load more (showing ${users.length}/${totalUsers} users)`}
                link
                onClick={() => fetchNextPage()}
            />}
        </SettingGroup>
    );
};

export default withErrorBoundary(Users, 'Staff');
