import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import React from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';

interface PortalLinksPrefs {

}

const PortalLinks: React.FC<PortalLinksPrefs> = () => {
    return (
        <ModalPage className='text-base text-black' heading='Links'>
            <p className='-mt-6 mb-16'>Use these links in your theme to show pages of Portal.</p>
            <List title='Generic'>
                <ListItem key='dummy' separator>
                    <div className='flex w-full items-center gap-5 py-3'>
                        <span className='inline-block w-[200px]'>Default</span>
                        <TextField className='border-b-500 w-full grow bg-transparent p-2 text-grey-700' containerClassName='w-full' value='http://localhost:2368/#/portal/signup/641966029e13def503dd5279/monthly' disabled unstyled />
                    </div>
                </ListItem>
            </List>
        </ModalPage>

    );
};

export default PortalLinks;