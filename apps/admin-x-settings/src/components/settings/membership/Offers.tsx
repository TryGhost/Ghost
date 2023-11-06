import React from 'react';
import useRouting from '../../../hooks/useRouting';
import {Button, SettingGroup, withErrorBoundary} from '@tryghost/admin-x-design';
import {checkStripeEnabled} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const openModal = () => {
        updateRoute('offers/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' disabled={!checkStripeEnabled(settings, config)} label='Manage offers' link linkWithPadding onClick={openModal}/>}
            description={<>Grow your audience by providing fixed or percentage discounts. <a className='text-green' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        />
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
