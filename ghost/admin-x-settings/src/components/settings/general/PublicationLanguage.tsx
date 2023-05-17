import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {ButtonColors} from '../../../admin-x-ds/global/Button';

const PublicationLanguage: React.FC = () => {
    const buttons = [
        {
            label: 'Edit',
            color: ButtonColors.Green
        }
    ];

    const viewValues = [
        {
            heading: 'Site language',
            key: 'site-language',
            value: 'en'

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
            <SettingGroupValues values={viewValues} />
        </SettingGroup>
    );
};

export default PublicationLanguage;