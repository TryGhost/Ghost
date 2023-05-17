import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import {ButtonColors} from '../../../admin-x-ds/global/Button';

const TimeZone: React.FC = () => {
    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        }
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                description="Set the time and date of your publication, used for all published posts" 
                title="Site timezone"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
};

export default TimeZone;