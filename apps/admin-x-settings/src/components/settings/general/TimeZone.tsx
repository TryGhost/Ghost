import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import timezoneData from '@tryghost/timezone-data';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Select, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getLocalTime} from '../../../utils/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

interface TimezoneDataDropdownOption {
    name: string;
    label: string;
}

interface HintProps {
    timezone: string;
}

const Hint: React.FC<HintProps> = ({timezone}) => {
    const [currentTime, setCurrentTime] = useState(getLocalTime(timezone));

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getLocalTime(timezone));
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [timezone]);
    return (
        <>
            The local time here is currently {currentTime}
        </>
    );
};

const TimeZone: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [publicationTimezone] = getSettingValues(localSettings, ['timezone']) as string[];

    const timezoneOptions: Array<{value: string; label: string}> = timezoneData.map((tzOption: TimezoneDataDropdownOption) => {
        return {
            value: tzOption.name,
            label: tzOption.label
        };
    });

    const handleTimezoneChange = (value?: string) => {
        updateSetting('timezone', value || null);
        handleEditingChange(true);
    };

    return (
        <TopLevelGroup
            description='Set the time and date of your publication, used for all published posts'
            hideEditButton={true}
            isEditing={isEditing}
            keywords={keywords}
            navid='timezone'
            saveState={saveState}
            testId='timezone'
            title='Site timezone'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Select
                    hint={<Hint timezone={publicationTimezone} />}
                    options={timezoneOptions}
                    selectedOption={timezoneOptions.find(option => option.value === publicationTimezone)}
                    testId='timezone-select'
                    title="Site timezone"
                    isSearchable
                    onSelect={option => handleTimezoneChange(option?.value)}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TimeZone, 'Site timezone');
