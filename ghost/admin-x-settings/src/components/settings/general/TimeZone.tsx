import React, {useEffect, useState} from 'react';
import Select from '../../../admin-x-ds/global/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import timezoneData from '@tryghost/timezone-data';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getLocalTime} from '../../../utils/helpers';

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

const TimeZone: React.FC = () => {
    const {
        currentState,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [publicationTimezone] = getSettingValues(['timezone']) as string[];

    const timezoneOptions = timezoneData.map((tzOption: TimezoneDataDropdownOption) => {
        return {
            value: tzOption.name,
            label: tzOption.label
        };
    });

    const handleTimezoneChange = (value: string) => {
        updateSetting('timezone', value);
    };

    const viewContent = (
        <SettingGroupContent values={[
            {
                key: 'site-timezone',
                value: publicationTimezone,
                hint: (
                    <Hint timezone={publicationTimezone} />
                )
            }
        ]} />
    );
    const inputFields = (
        <SettingGroupContent columns={1}>
            <Select
                defaultSelectedOption={publicationTimezone}
                hint={<Hint timezone={publicationTimezone} />}
                options={timezoneOptions}
                title="Site timezone"
                onSelect={handleTimezoneChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Set the time and date of your publication, used for all published posts'
            navid='timezone'
            saveState={saveState}
            state={currentState}
            testId='timezone'
            title='Site timezone'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? viewContent : inputFields}
        </SettingGroup>
    );
};

export default TimeZone;
