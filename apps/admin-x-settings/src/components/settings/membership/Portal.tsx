import React from 'react';
import useRouting from '../../../hooks/useRouting';
import {Button, SettingGroup, withErrorBoundary} from '@tryghost/admin-x-design';
import {getSettingValues} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [membersSignupAccess] = getSettingValues<string>(settings, ['members_signup_access']);

    const openPreviewModal = () => {
        updateRoute('portal/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' disabled={membersSignupAccess === 'none'} label='Customize' link linkWithPadding onClick={openPreviewModal}/>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid='portal'
            testId='portal'
            title="Portal settings"
        />
    );
};

export default withErrorBoundary(Portal, 'Portal settings');
