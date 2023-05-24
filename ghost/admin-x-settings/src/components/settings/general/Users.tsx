import Button from '../../../admin-x-ds/global/Button';
import InviteUserModal from '../../modals/InviteUserModal';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';

const Users: React.FC = () => {
    const showAddModal = () => {        
        NiceModal.show(InviteUserModal);
    };

    const buttons = (
        <Button color='green' label='Invite users' link={true} onClick={() => {
            showAddModal();
        }} />
    );

    const owner = (
        <div className='flex flex-col'>
            <span>Cristofer Vaccaro &mdash; <strong>Owner</strong></span>
            <span className='text-xs text-grey-700'>cristofer@example.com</span>
        </div>
    );

    const admins = (
        <List>
            <ListItem 
                action={<Button color='green' label='Edit' link={true} />}
                detail='alena@press.com'
                hideActions={true}
                id='list-item-1'
                title='Alena Press' />
        </List>
    );

    const editors = (
        <List>
            <ListItem 
                action={<Button color='green' label='Edit' link={true} />}
                detail='lydia@siphron.com'
                hideActions={true}
                id='list-item-1'
                title='Lydia Siphron' />
            <ListItem 
                action={<Button color='green' label='Edit' link={true} />}
                detail='james@korsgaard.com'
                hideActions={true}
                id='list-item-1'
                title='James Korsgaard' />
        </List>
    );

    const tabs = [
        {id: 'users-admins', title: 'Administrators', contents: admins},
        {id: 'users-editors', title: 'Editors', contents: editors}
    ];

    return (
        <SettingGroup 
            customButtons={buttons}
            title='Users and permissions'
        >
            {owner}
            <TabView tabs={tabs} />
        </SettingGroup>
    );
};

export default Users;