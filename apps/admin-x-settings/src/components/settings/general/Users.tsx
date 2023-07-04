import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../admin-x-ds/global/NoValueLabel';
import React, {useContext, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import UserDetailModal from './UserDetailModal';
import useRouting from '../../../hooks/useRouting';
import useStaffUsers from '../../../hooks/useStaffUsers';
import {ServicesContext} from '../../providers/ServiceProvider';
import {User} from '../../../types/api';
import {UserInvite} from '../../../utils/api';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';
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

const Owner: React.FC<OwnerProps> = ({user, updateUser}) => {
    const showDetailModal = () => {
        NiceModal.show(UserDetailModal, {user, updateUser});
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

const UsersList: React.FC<UsersListProps> = ({users, updateUser}) => {
    const showDetailModal = (user: User) => {
        NiceModal.show(UserDetailModal, {user, updateUser});
    };

    if (!users || !users.length) {
        return (
            <NoValueLabel icon='single-user-neutral-block'>
                No users found.
            </NoValueLabel>
        );
    }

    return (
        <List>
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
    const {api} = useContext(ServicesContext);
    const {setInvites} = useStaffUsers();
    const [revokeState, setRevokeState] = useState<'progress'|''>('');
    const [resendState, setResendState] = useState<'progress'|''>('');
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
                    await api.invites.delete(invite.id);
                    const res = await api.invites.browse();
                    setInvites(res.invites);
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
                    await api.invites.delete(invite.id);
                    await api.invites.add({
                        email: invite.email,
                        roleId: invite.role_id
                    });
                    const res = await api.invites.browse();
                    setInvites(res.invites);
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
            <NoValueLabel icon='single-user-neutral-block'>
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
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        invites,
        updateUser
    } = useStaffUsers();
    const {updateRoute} = useRouting();
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
            contents: (<UsersList updateUser={updateUser} users={adminUsers} />)
        },
        {
            id: 'users-editors',
            title: 'Editors',
            contents: (<UsersList updateUser={updateUser} users={editorUsers} />)
        },
        {
            id: 'users-authors',
            title: 'Authors',
            contents: (<UsersList updateUser={updateUser} users={authorUsers} />)
        },
        {
            id: 'users-contributors',
            title: 'Contributors',
            contents: (<UsersList updateUser={updateUser} users={contributorUsers} />)
        },
        {
            id: 'users-invited',
            title: 'Invited',
            contents: (<InvitesUserList updateUser={updateUser} users={invites} />)
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
            <Owner updateUser={updateUser} user={ownerUser} />
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Users;
