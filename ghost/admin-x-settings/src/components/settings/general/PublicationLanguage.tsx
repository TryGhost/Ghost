import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React, {useContext} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {ButtonColors} from '../../../admin-x-ds/global/Button';
import {SettingsContext} from '../../SettingsProvider';
import {getSettingValue} from '../../../utils/helpers';

const PublicationLanguage: React.FC = () => {
    const {settings} = useContext(SettingsContext) || {};
    const publicationLanguage = getSettingValue(settings, 'locale');
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
            value: publicationLanguage
        }
    ];

    const custonHeader = (
        <SettingGroupHeader
            description="Set the language/locale which is used on your site"
            title="Publication Language"
        >
            <ButtonGroup buttons={buttons} link={true} />
        </SettingGroupHeader>
    );

    return (
        <SettingGroup customHeader={custonHeader}>
            <SettingGroupValues values={viewValues} />
        </SettingGroup>
    );
};

export default PublicationLanguage;