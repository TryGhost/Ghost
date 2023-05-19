import React, {useContext, useEffect, useRef, useState} from 'react';
import SettingGroup, {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import {SettingsContext} from '../../SettingsProvider';
import {getSettingValue} from '../../../utils/helpers';

const PublicationLanguage: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');
    const {settings, saveSettings} = useContext(SettingsContext) || {};
    const savedPublicationLanguage = getSettingValue(settings, 'locale');
    const [publicationLanguage, setPublicationLanguage] = useState(savedPublicationLanguage);
    const languageRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentState !== 'view' && languageRef.current) {
            languageRef.current.focus();
        }
    }, [currentState]);

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const handleSave = () => {
        saveSettings?.([
            {
                key: 'locale',
                value: publicationLanguage
            }
        ]);
        setCurrentState('view');
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentState('unsaved');
        setPublicationLanguage(e.target.value);
    };

    const viewValues = [
        {
            heading: 'Site language',
            key: 'site-language',
            value: publicationLanguage
        }
    ];

    const inputFields = (
        <SettingGroupContent columns={2}>
            <TextField
                inputRef={languageRef}
                placeholder="Site language"
                title='Site language'
                value={publicationLanguage}
                onChange={handleLanguageChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description="Set the language/locale which is used on your site"
            state={currentState}
            title="Publication Language"
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? <SettingGroupContent values={viewValues} /> : inputFields }
        </SettingGroup>
    );
};

export default PublicationLanguage;