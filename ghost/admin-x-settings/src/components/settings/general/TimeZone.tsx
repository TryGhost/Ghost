import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React, {useContext, useEffect, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import {SettingsContext} from '../../SettingsProvider';
import {getLocalTime, getSettingValue} from '../../../utils/helpers';

const TimeZone: React.FC = () => {
    const {settings} = useContext(SettingsContext) || {};
    const publicationTimezone = getSettingValue(settings, 'timezone');

    const [currentTime, setCurrentTime] = useState(getLocalTime(publicationTimezone));
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getLocalTime(publicationTimezone));
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [publicationTimezone]);

    const buttons = [
        {
            label: 'Edit',
            color: 'green'
        }
    ];

    const viewValues = [
        {
            key: 'site-timezone',
            value: publicationTimezone,
            hint: `The local time here is currently ${currentTime}`
        }
    ];

    const customHeader = (
        <SettingGroupHeader
            description="Set the time and date of your publication, used for all published posts"
            title="Site timezone"
        >
            <ButtonGroup buttons={buttons} link={true} />
        </SettingGroupHeader>
    );

    return (
        <SettingGroup customHeader={customHeader}>
            <SettingGroupContent values={viewValues} />
        </SettingGroup>
    );
};

export default TimeZone;