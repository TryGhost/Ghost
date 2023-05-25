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

const Owner: React.FC<any> = ({user}) => {
    if (!user) {
        return null;
    }
    return (
        <div className='flex flex-col'>
            <span>{user.name} &mdash; <strong>Owner</strong></span>
            <span className='text-xs text-grey-700'>{user.email}</span>
        </div>
    );
};

const UsersList: React.FC<any> = ({users}) => {
    const showDetailModal = () => {
        NiceModal.show(UserDetailModal);
    };

    if (!users || !users.length) {
        return (
            <div className='mt-2 text-grey-700'>
                <p>No users found</p>
            </div>
        );
    }

    return (
        <List>
            {users.map((user: any) => {
                return (
                    <ListItem
                        key={user.id}
                        action={<Button color='green' label='Edit' link={true} onClick={showDetailModal} />}
                        detail={user.email}
                        hideActions={true}
                        id={`list-item-${user.id}`}
                        title={user.name} />
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