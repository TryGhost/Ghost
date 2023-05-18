import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React, {useContext, useEffect, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {ButtonColors} from '../../../admin-x-ds/global/Button';
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
            color: ButtonColors.Green
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
            <SettingGroupValues values={viewValues} />
        </SettingGroup>
    );
};

export default TimeZone;