import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {checkStripeEnabled} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const openModal = () => {
        updateRoute('offers/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' disabled={!checkStripeEnabled(settings, config)} label='Manage offers' link linkWithPadding onClick={openModal}/>}
            description='Grow your audience by providing fixed or percentage discounts. [Learn more]'
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        />
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
