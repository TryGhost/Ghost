import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useDefaultRecipientsOptions from './useDefaultRecipientsOptions';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {MultiSelect, MultiSelectOption, Select, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {MultiValue} from 'react-select';
import {getOptionLabel} from '../../../utils/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

type RefipientValueArgs = {
    defaultEmailRecipients: string;
    defaultEmailRecipientsFilter: string|null;
};

const RECIPIENT_FILTER_OPTIONS = [{
    label: 'Whoever has access to the post',
    hint: 'Free posts to everyone, premium posts sent to paid members',
    value: 'visibility'
}, {
    label: 'All members',
    hint: 'Everyone who is subscribed to newsletter updates, whether free or paid members',
    value: 'all-members'
}, {
    label: 'Paid-members only',
    hint: 'People who have a premium subscription',
    value: 'paid-only'
}, {
    label: 'Specific people',
    hint: 'Only people with any of the selected tiers or labels',
    value: 'segment'
}, {
    label: 'Usually nobody',
    hint: 'Newsletters are off for new posts, but can be enabled when needed',
    value: 'none'
}];

function getDefaultRecipientValue({
    defaultEmailRecipients,
    defaultEmailRecipientsFilter
}: RefipientValueArgs): string {
    if (defaultEmailRecipients === 'filter') {
        if (defaultEmailRecipientsFilter === 'status:free,status:-free') {
            return 'all-members';
        } else if (defaultEmailRecipientsFilter === 'status:-free') {
            return 'paid-only';
        } else if (defaultEmailRecipientsFilter === null) {
            return 'none';
        } else {
            return 'segment';
        }
    }

    return defaultEmailRecipients;
}

const DefaultRecipients: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [defaultEmailRecipients, defaultEmailRecipientsFilter] = getSettingValues(localSettings, [
        'editor_default_email_recipients', 'editor_default_email_recipients_filter'
    ]) as [string, string|null];

    const [selectedOption, setSelectedOption] = useState(getDefaultRecipientValue({
        defaultEmailRecipients,
        defaultEmailRecipientsFilter
    }));

    const {loadOptions, selectedSegments, setSelectedSegments} = useDefaultRecipientsOptions(selectedOption, defaultEmailRecipientsFilter);

    const setDefaultRecipientValue = (value: string) => {
        if (['visibility', 'disabled'].includes(value)) {
            updateSetting('editor_default_email_recipients', value);
            updateSetting('editor_default_email_recipients_filter', null);
        } else {
            updateSetting('editor_default_email_recipients', 'filter');
        }

        if (value === 'all-members') {
            updateSetting('editor_default_email_recipients_filter', 'status:free,status:-free');
        }

        if (value === 'paid-only') {
            updateSetting('editor_default_email_recipients_filter', 'status:-free');
        }

        if (value === 'none') {
            updateSetting('editor_default_email_recipients_filter', null);
        }

        setSelectedOption(value);
    };

    const updateSelectedSegments = (selected: MultiValue<MultiSelectOption>) => {
        setSelectedSegments(selected);

        if (selected.length) {
            const selectedGroups = selected?.map(({value}) => value).join(',');
            updateSetting('editor_default_email_recipients_filter', selectedGroups);
        } else {
            updateSetting('editor_default_email_recipients_filter', null);
            setSelectedOption('none');
        }
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Default Newsletter recipients',
                    key: 'default-recipients',
                    value: getOptionLabel(RECIPIENT_FILTER_OPTIONS, selectedOption)
                }
            ]}
        />
    );

    const form = (
        <SettingGroupContent columns={1}>
            <Select
                hint='Who should receive your posts by default?'
                options={RECIPIENT_FILTER_OPTIONS}
                selectedOption={RECIPIENT_FILTER_OPTIONS.find(option => option.value === selectedOption)}
                testId='default-recipients-select'
                title="Default Newsletter recipients"
                onSelect={(option) => {
                    if (option) {
                        setDefaultRecipientValue(option.value);
                    }
                }}
            />
            {(selectedOption === 'segment') && selectedSegments && (
                <MultiSelect
                    loadOptions={loadOptions}
                    title='Filter'
                    values={selectedSegments}
                    async
                    defaultOptions
                    onChange={updateSelectedSegments}
                />
            )}
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='When you publish new content, who do you usually want to send it to?'
            isEditing={isEditing}
            keywords={keywords}
            navid='default-recipients'
            saveState={saveState}
            testId='default-recipients'
            title='Default recipients'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? form : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DefaultRecipients, 'Default recipients');
