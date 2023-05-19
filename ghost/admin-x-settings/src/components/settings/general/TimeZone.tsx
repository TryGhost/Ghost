import Dropdown from '../../../admin-x-ds/global/Dropdown';
import React, {useContext, useEffect, useState} from 'react';
import SettingGroup, {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import timezoneData from '@tryghost/timezone-data';
import {SettingsContext} from '../../SettingsProvider';
import {getLocalTime, getSettingValue} from '../../../utils/helpers';

interface TimezoneDataDropdownOption {
    name: string;
    label: string;
}

const TimeZone: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');
    const {settings, saveSettings} = useContext(SettingsContext) || {};
    const savedPublicationTimezone = getSettingValue(settings, 'timezone');
    const [publicationTimezone, setPublicationTimezone] = useState(savedPublicationTimezone);

    const [currentTime, setCurrentTime] = useState(getLocalTime(publicationTimezone));
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getLocalTime(publicationTimezone));
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [publicationTimezone]);

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const handleSave = () => {
        saveSettings?.([
            {
                key: 'timezone',
                value: publicationTimezone
            }
        ]);
        setCurrentState('view');
    };

    const viewValues = [
        {
            key: 'site-timezone',
            value: publicationTimezone,
            hint: `The local time here is currently ${currentTime}`
        }
    ];

    const timezoneOptions = timezoneData.map((tzOption: TimezoneDataDropdownOption) => {
        return {
            value: tzOption.name,
            label: tzOption.label
        };
    });

    const inputFields = (
        <SettingGroupContent columns={1}>
            <Dropdown
                defaultSelectedOption={publicationTimezone}
                hint={`The local time here is currently ${currentTime}`}
                options={timezoneOptions}
                title="Site timezone"
                onSelect={(value) => {
                    setCurrentState('unsaved');
                    setPublicationTimezone(value);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Set the time and date of your publication, used for all published posts'
            state={currentState}
            title='Site timezone'
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? <SettingGroupContent values={viewValues} /> : inputFields}
        </SettingGroup>
    );
};

export default TimeZone;