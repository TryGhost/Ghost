import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../admin-x-ds/global/NoValueLabel';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import UserDetailModal from './UserDetailModal';
import useDetailModalRoute from '../../../hooks/useDetailModalRoute';
import useRouting from '../../../hooks/useRouting';
import useStaffUsers from '../../../hooks/useStaffUsers';
import {User} from '../../../api/users';
import {UserInvite, useAddInvite, useDeleteInvite} from '../../../api/invites';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';
import {modalRoutes} from '../../providers/RoutingProvider';
import {showToast} from '../../../admin-x-ds/global/Toast';

interface OwnerProps {
    user: User;
    updateUser?: (user: User) => void;
}

interface UsersListProps {
    users: User[];
    updateUser?: (user: User) => void;
}

interface InviteListProps {
    users: UserInvite[];
    updateUser?: (user: User) => void;
}

const Owner: React.FC<OwnerProps> = ({user}) => {
    const {updateRoute} = useRouting();

    const showDetailModal = () => {
        updateRoute({route: modalRoutes.showUser, params: {slug: user.slug}});
    };

    if (!user) {
        return null;
    }

    return (
        <div className='group flex gap-3 hover:cursor-pointer' data-testid='owner-user' onClick={showDetailModal}>
            <Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image} label={getInitials(user.name)} labelColor='white' size='lg' />
            <div className='flex flex-col'>
                <span>{user.name} &mdash; <strong>Owner</strong> <button className='invisible ml-2 inline-block text-sm font-bold text-green group-hover:visible' type='button'>Edit</button></span>
                <span className='text-xs text-grey-700'>{user.email}</span>
            </div>
        </div>
    );
};

const UsersList: React.FC<UsersListProps> = ({users}) => {
    const {updateRoute} = useRouting();

    const showDetailModal = (user: User) => {
        updateRoute({route: modalRoutes.showUser, params: {slug: user.slug}});
    };

    if (!users || !users.length) {
        return (
            <NoValueLabel icon='single-user-block'>
                No users found.
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
                return (
                    <ListItem
                        key={user.id}
                        action={<Button color='green' label='Edit' link={true} onClick={() => showDetailModal(user)}/>}
                        avatar={(<Avatar bgColor={generateAvatarColor((user.name ? user.name : user.email))} image={user.profile_image} label={getInitials(user.name)} labelColor='white' />)}
                        className='min-h-[64px]'
                        detail={user.email}
                        hideActions={true}
                        id={`list-item-${user.id}`}
                        separator={false}
                        testId='user-list-item'
                        title={title}
                        onClick={() => showDetailModal(user)} />
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
                    setRevokeState('progress');
                    await deleteInvite(invite.id);
                    setRevokeState('');
                    showToast({
                        message: `Invitation revoked (${invite.email})`,
                        type: 'success'
                    });
                }}
            />
            <Button
                className='ml-2'
                color='green'
                label={resendActionLabel}
                link={true}
                onClick={async () => {
                    setResendState('progress');
                    await deleteInvite(invite.id);
                    await addInvite({
                        email: invite.email,
                        roleId: invite.role_id
                    });
                    setResendState('');
                    showToast({
                        message: `Invitation resent! (${invite.email})`,
                        type: 'success'
                    });
                }}
            />
        </div>
    );
};

const InvitesUserList: React.FC<InviteListProps> = ({users}) => {
    if (!users || !users.length) {
        return (
            <NoValueLabel icon='single-user-block'>
                No users found.
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

const Users: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        invites
    } = useStaffUsers();

    const {updateRoute} = useRouting();

    useDetailModalRoute({
        route: modalRoutes.showUser,
        items: users,
        field: 'slug',
        showModal: user => NiceModal.show(UserDetailModal, {user})
    });

    const showInviteModal = () => {
        updateRoute('users/invite');
    };

    const buttons = (
        <Button color='green' label='Invite users' link={true} onClick={() => {
            showInviteModal();
        }} />
    );

    const [selectedTab, setSelectedTab] = useState('users-admins');

    const tabs = [
        {
            id: 'users-admins',
            title: 'Administrators',
            contents: (<UsersList users={adminUsers} />)
        },
        {
            id: 'users-editors',
            title: 'Editors',
            contents: (<UsersList users={editorUsers} />)
        },
        {
            id: 'users-authors',
            title: 'Authors',
            contents: (<UsersList users={authorUsers} />)
        },
        {
            id: 'users-contributors',
            title: 'Contributors',
            contents: (<UsersList users={contributorUsers} />)
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
            keywords={keywords}
            navid='users'
            testId='users'
            title='Users and permissions'
        >
            <Owner user={ownerUser} />
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Users;
