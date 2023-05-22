import Button from '../../../admin-x-ds/global/Button';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Users: React.FC = () => {
    const buttons = (
        <Button color='green' label='Invite users' link={true} />
    );

    const owner = (
        <div className='flex flex-col'>
            <span className='text-sm'>Cristofer Vaccaro — <strong>Owner</strong></span>
            <span className='text-xs text-grey-700'>cristofer@example.com</span>
        </div>
    );

    const list = (
        <List title='Users'>
            <ListItem 
                action={<Button color='green' label='Edit' link={true} />}
                detail='alena@press.com'
                hideActions={true}
                id='list-item-1'
                title='Alena Press' />
            <ListItem 
                action={<Button color='green' label='Edit' link={true} />}
                detail='martin@culhane.com'
                hideActions={true}
                id='list-item-1'
                title='Martin Culhane' />
        </List>
    );

    return (
        <SettingGroup 
            customButtons={buttons}
            title='Users and permissions'
        >
            {owner}
            {list}
        </SettingGroup>
    );
};

export default Users;