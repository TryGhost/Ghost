import Button from '../../../admin-x-ds/global/Button';
import InviteUserModal from './modals/InviteUserModal';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import UserDetailModal from './modals/UserDetailModal';
import useStaffUsers from '../../../hooks/useStaffUsers';
import {User} from '../../../types/api';

const Owner: React.FC<{user: User}> = ({user}) => {
    const showDetailModal = () => {
        NiceModal.show(UserDetailModal, {user});
    };

    if (!user) {
        return null;
    }
    return (
        <div className='group flex flex-col hover:cursor-pointer' onClick={showDetailModal}>
            <span>{user.name} &mdash; <strong>Owner</strong> <span className='invisible ml-2 inline-block text-sm font-bold text-green group-hover:visible'>Edit</span></span>
            <span className='text-xs text-grey-700'>{user.email}</span>
        </div>
    );
};

interface UsersListProps {
    users: User[];
}

const UsersList: React.FC<UsersListProps> = ({users}) => {
    const showDetailModal = (user: User) => {
        NiceModal.show(UserDetailModal, {user});
    };

    if (!users || !users.length) {
        return (
            <div className='mt-2 py-10 text-center text-sm text-grey-700'>
                No users found.
            </div>
        );
    }

    return (
        <List>
            {users.map((user) => {
                return (
                    <ListItem
                        key={user.id}
                        action={<Button color='green' label='Edit' link={true} onClick={() => showDetailModal(user)}/>}
                        detail={user.email}
                        hideActions={true}
                        id={`list-item-${user.id}`}
                        title={user.name}
                        onClick={() => showDetailModal(user)} />
                );
            })}
        </List>
    );
};

const Users: React.FC = () => {
    const {
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers
    } = useStaffUsers();

    const showInviteModal = () => {
        NiceModal.show(InviteUserModal);
    };

    const buttons = (
        <Button color='green' label='Invite users' link={true} onClick={() => {
            showInviteModal();
        }} />
    );

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
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
            title='Users and permissions'
        >
            <Owner user={ownerUser} />
            <TabView tabs={tabs} />
        </SettingGroup>
    );
};

export default Users;