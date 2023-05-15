import React from 'react';
import { ButtonColors } from '../../design-system/globals/Button';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';
import ButtonGroup from '../../design-system/globals/ButtonGroup';

const PublicationLanguage: React.FC = () => {

    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        },
    ];

    return (
        <SettingGroup>
            <SettingGroupHeader 
                title="Publication Language" 
                description="Set the language/locale which is used on your site"
            >
                <ButtonGroup buttons={buttons} link={true} />
            </SettingGroupHeader>
        </SettingGroup>
    );
}

export default PublicationLanguage;