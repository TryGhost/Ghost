import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useRouting from '../../../hooks/useRouting';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const openModal = () => {
        updateRoute('offers/edit');
    };

    return (
        <TopLevelGroup
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
