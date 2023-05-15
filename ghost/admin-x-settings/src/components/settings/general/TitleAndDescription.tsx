import ButtonGroup from '../../design-system/globals/ButtonGroup';
import React from 'react';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import {ButtonColors} from '../../design-system/globals/Button';

const TitleAndDescription: React.FC = () => {
    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        }
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                description="The details used to identify your publication around the web" 
                title="Title & description"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
};

export default TitleAndDescription;