import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [membersSignupAccess] = getSettingValues<string>(settings, ['members_signup_access']);

    const openPreviewModal = () => {
        updateRoute('portal/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' disabled={membersSignupAccess === 'none'} label='Customize' size='sm' onClick={openPreviewModal}/>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid='portal'
            testId='portal'
            title="Portal settings"
        />
    );
};

export default withErrorBoundary(Portal, 'Portal settings');
