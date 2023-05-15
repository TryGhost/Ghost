import React from 'react';
import { ButtonColors } from '../../design-system/globals/Button';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import ButtonGroup from '../../design-system/globals/ButtonGroup';

const TimeZone: React.FC = () => {

    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        },
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                title="Site timezone" 
                description="Set the time and date of your publication, used for all published posts"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
}

export default TimeZone;