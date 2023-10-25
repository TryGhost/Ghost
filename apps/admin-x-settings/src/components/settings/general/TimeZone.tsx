import React, {useEffect, useState} from 'react';
import Select from '../../../admin-x-ds/global/form/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import timezoneData from '@tryghost/timezone-data';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getLocalTime} from '../../../utils/helpers';
import {getSettingValues} from '../../../api/settings';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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

    const publicationTimezoneData = timezoneOptions.find(option => option.value === publicationTimezone);

    const handleTimezoneChange = (value?: string) => {
        updateSetting('timezone', value || null);
    };

    const viewContent = (
        <SettingGroupContent values={[
            {
                key: 'site-timezone',
                value: <div className='flex flex-col'>
                    {publicationTimezoneData?.label || publicationTimezone}
                    <span className='text-xs'><Hint timezone={publicationTimezone} /></span>
                </div>
            }
        ]} />
    );
    const inputFields = (
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
    );

    return (
        <SettingGroup
            description='Set the time and date of your publication, used for all published posts'
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
            {isEditing ? inputFields : viewContent}
        </SettingGroup>
    );
};

export default withErrorBoundary(TimeZone, 'Site timezone');
