import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {ChevronDown} from 'lucide-react';
import {Field, FieldDescription, FieldLabel, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger, inputSurface} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/admin-x-design-system';
import {getLocalTime} from '../../../utils/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {timezoneDataWithGMTOffset} from '@tryghost/timezone-data';
import {withErrorBoundary} from '../../error-boundary';

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
    const [timezoneOpen, setTimezoneOpen] = useState(false);
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

    const timezoneOptions: Array<{value: string; label: string}> = timezoneDataWithGMTOffset().map((tzOption: TimezoneDataDropdownOption) => {
        return {
            value: tzOption.name,
            label: tzOption.label
        };
    });
    const selectedTimezone = timezoneOptions.find(option => option.value === publicationTimezone);

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
                <Field>
                    <FieldLabel>Site timezone</FieldLabel>
                    <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                        <PopoverTrigger asChild>
                            <button aria-label='Site timezone' className={`${inputSurface('self')} flex h-(--control-height) w-full items-center justify-between px-3 text-control`} data-testid='timezone-select' role='combobox' type='button'>
                                <span className='truncate'>{selectedTimezone?.label}</span>
                                <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align='start' className='z-[9999] w-(--radix-popover-trigger-width) p-0'>
                            <MultiSelectCombobox
                                i18n={{searchPlaceholder: 'Search timezones...'}}
                                isMultiSelect={false}
                                options={timezoneOptions}
                                values={publicationTimezone ? [publicationTimezone] : []}
                                autoCloseOnSelect
                                onChange={(values) => {
                                    if (values[0]) {
                                        handleTimezoneChange(values[0]);
                                    }
                                }}
                                onClose={() => setTimezoneOpen(false)}
                            />
                        </PopoverContent>
                    </Popover>
                    <FieldDescription><Hint timezone={publicationTimezone} /></FieldDescription>
                </Field>
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TimeZone, 'Site timezone');
