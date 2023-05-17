import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {ButtonColors} from '../../../admin-x-ds/global/Button';

const TimeZone: React.FC = () => {
    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        }
    ];

    const viewValues = [
        {
            key: 'site-timezone',
            value: '(GMT +2:00) Cairo, Egypt',
            hint: 'The local time here is currently 12:04:09'
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
            <SettingGroupValues values={viewValues} />
        </SettingGroup>
    );
};

export default TimeZone;