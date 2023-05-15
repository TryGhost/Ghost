import ButtonGroup from '../../design-system/globals/ButtonGroup';
import React from 'react';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import {ButtonColors} from '../../design-system/globals/Button';

const PublicationLanguage: React.FC = () => {
    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        }
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                description="Set the language/locale which is used on your site" 
                title="Publication Language"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
};

export default PublicationLanguage;