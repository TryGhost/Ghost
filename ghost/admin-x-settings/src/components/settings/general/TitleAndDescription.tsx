import React, {useContext, useEffect, useRef, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import {SettingsContext} from '../../SettingsProvider';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';
import {getSettingValue} from '../../../utils/helpers';

const TitleAndDescription: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');
    const {settings, saveSettings} = useContext(SettingsContext) || {};
    const savedSiteTitle = getSettingValue(settings, 'title');
    const savedSiteDescription = getSettingValue(settings, 'description');
    const [siteTitle, setSiteTitleValue] = useState(savedSiteTitle);
    const [siteDescription, setSiteDescriptionValue] = useState(savedSiteDescription);
    const siteTitleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentState !== 'view' && siteTitleRef.current) {
            siteTitleRef.current.focus();
        }
    }, [currentState]);

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const handleSave = () => {
        saveSettings?.([
            {
                key: 'title',
                value: siteTitle
            },
            {
                key: 'description',
                value: siteDescription
            }
        ]);
        setCurrentState('view');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentState('unsaved');
        setSiteTitleValue(e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentState('unsaved');
        setSiteDescriptionValue(e.target.value);
    };

    const viewValues = [
        {
            heading: 'Site title',
            key: 'site-title',
            value: siteTitle
        },
        {
            heading: 'Site description',
            key: 'site-description',
            value: siteDescription
        }
    ];

    const inputFields = (
        <SettingGroupContent columns={2}>
            <TextField
                hint="The name of your site"
                inputRef={siteTitleRef}
                placeholder="Site title"
                title="Site title"
                value={siteTitle}
                onChange={handleTitleChange}
            />
            <TextField
                hint="Used in your theme, meta data and search results"
                placeholder="Enter something"
                title="Site description"
                value={siteDescription}
                onChange={handleDescriptionChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description='The details used to identify your publication around the web' 
            state={currentState}
            title='Title & description'
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? <SettingGroupContent columns={2} values={viewValues} /> : inputFields }
        </SettingGroup>
    );
};

export default TitleAndDescription;