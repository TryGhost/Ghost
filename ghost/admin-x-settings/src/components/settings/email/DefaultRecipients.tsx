import MultiSelect, {MultiSelectOption} from '../../../admin-x-ds/global/MultiSelect';
import React from 'react';
import Select from '../../../admin-x-ds/global/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {MultiValue} from 'react-select';
import {getOptionLabel} from '../../../utils/helpers';

type RefipientValueArgs = {
    defaultEmailRecipients: string;
    defaultEmailRecipientsFilter: string|null;
};

const RECIPIENT_FILTER_OPTIONS = [{
    label: 'Whoever has access to the post',
    value: 'visibility'
}, {
    label: 'All members',
    value: 'all-members'
}, {
    label: 'Paid-members only',
    value: 'paid-only'
}, {
    label: 'Specific people',
    value: 'segment'
}, {
    label: 'Usually nobody',
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

const DefaultRecipients: React.FC = () => {
    const {
        currentState,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [defaultEmailRecipients, defaultEmailRecipientsFilter] = getSettingValues([
        'editor_default_email_recipients', 'editor_default_email_recipients_filter'
    ]) as [string, string|null];

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
    };

    const emailRecipientValue = getDefaultRecipientValue({
        defaultEmailRecipients,
        defaultEmailRecipientsFilter
    });

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Default Newsletter recipients',
                    key: 'default-recipients',
                    value: getOptionLabel(RECIPIENT_FILTER_OPTIONS, emailRecipientValue)
                }
            ]}
        />
    );

    const form = (
        <SettingGroupContent columns={1}>
            <Select
                defaultSelectedOption={emailRecipientValue}
                hint='Who should be able to subscribe to your site?'
                options={RECIPIENT_FILTER_OPTIONS}
                title="Default Newsletter recipients"
                onSelect={(value) => {
                    setDefaultRecipientValue(value);
                }}
            />
            {(emailRecipientValue === 'segment') && (
                <MultiSelect
                    defaultValues={[
                        {value: 'option2', label: 'Fake tier 2'}
                    ]}
                    options={[
                        {value: 'option1', label: 'Fake tier 1'},
                        {value: 'option2', label: 'Fake tier 2'},
                        {value: 'option3', label: 'Fake tier 3'}
                    ]}
                    title='Select tiers'
                    clearBg
                    onChange={(selected: MultiValue<MultiSelectOption>) => {
                        selected?.map(o => (
                            alert(`${o.label} (${o.value})`)
                        ));
                    }}
                />
            )}
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='When you publish new content, who do you usually want to send it to?'
            navid='default-recipients'
            saveState={saveState}
            state={currentState}
            testId='default-recipients'
            title='Default recipients'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : form}
        </SettingGroup>
    );
};

export default DefaultRecipients;
