import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import {ButtonColors} from '../../../admin-x-ds/global/Button';

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