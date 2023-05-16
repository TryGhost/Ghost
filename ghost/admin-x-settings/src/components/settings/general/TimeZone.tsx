import ButtonGroup from '../../design-system/globals/ButtonGroup';
import React from 'react';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import {ButtonColors} from '../../design-system/globals/Button';

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