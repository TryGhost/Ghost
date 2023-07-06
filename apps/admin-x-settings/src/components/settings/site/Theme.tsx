import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';

const Theme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    return (
        <SettingGroup
            customButtons={<Button color='green' label='Manage themes' link onClick={() => {
                updateRoute('design/edit/themes');
            }}/>}
            description="Change or upload themes"
            keywords={keywords}
            navid='theme'
            testId='theme'
            title="Theme"
        />
    );
};

export default Theme;
