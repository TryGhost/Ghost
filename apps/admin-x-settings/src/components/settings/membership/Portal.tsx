import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {getSettingValues} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();

    const openPreviewModal = () => {
        updateRoute('portal/edit');
    };

    const [membersSignupAccess] = getSettingValues<string>(settings, ['members_signup_access']);

    return (
        <SettingGroup
            customButtons={<Button color='green' disabled={membersSignupAccess === 'none'} label='Customize' link onClick={openPreviewModal}/>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid='portal'
            testId='portal'
            title="Portal settings"
        />
    );
};

export default Portal;
