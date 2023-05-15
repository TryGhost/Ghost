import React from 'react';
import Button, { ButtonColors } from '../../design-system/globals/Button';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import ButtonGroup from '../../design-system/globals/ButtonGroup';

const TitleAndDescription: React.FC = () => {

    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        },
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                title="Title & description" 
                description="The details used to identify your publication around the web"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
}

export default TitleAndDescription;