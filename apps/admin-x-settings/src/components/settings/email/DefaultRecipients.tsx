import MultiSelect, {MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import React, {useContext, useEffect, useState} from 'react';
import Select from '../../../admin-x-ds/global/form/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {GroupBase, MultiValue} from 'react-select';
import {Label, Offer, Tier} from '../../../types/api';
import {ServicesContext} from '../../providers/ServiceProvider';
import {getOptionLabel, getPaidActiveTiers, getSettingValues} from '../../../utils/helpers';

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

const SIMPLE_SEGMENT_OPTIONS: MultiSelectOption[] = [{
    label: 'Free members',
    value: 'status:free',
    color: 'green'
}, {
    label: 'Paid members',
    value: 'status:-free',
    color: 'pink'
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

    const {api} = useContext(ServicesContext);
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);

    useEffect(() => {
        api.tiers.browse().then((response) => {
            setTiers(getPaidActiveTiers(response.tiers));
        });

        api.labels.browse().then((response) => {
            setLabels(response.labels);
        });

        api.offers.browse().then((response) => {
            setOffers(response.offers);
        });
    }, [api]);

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

    const segmentOptionGroups: GroupBase<MultiSelectOption>[] = [
        {
            options: SIMPLE_SEGMENT_OPTIONS
        },
        {
            label: 'Active Tiers',
            options: tiers.filter(({active}) => active).map(tier => ({value: tier.id, label: tier.name, color: 'black'}))
        },
        {
            label: 'Archived Tiers',
            options: tiers.filter(({active}) => !active).map(tier => ({value: tier.id, label: tier.name, color: 'black'}))
        },
        {
            label: 'Labels',
            options: labels.map(label => ({value: `label:${label.slug}`, label: label.name, color: 'grey'}))
        },
        {
            label: 'Offers',
            options: offers.map(offer => ({value: `offer_redemptions:${offer.id}`, label: offer.name, color: 'black'}))
        }
    ];

    const filters = defaultEmailRecipientsFilter?.split(',') || [];
    const selectedSegments = segmentOptionGroups
        .flatMap(({options}) => options)
        .filter(({value}) => filters.includes(value));

    const setSelectedSegments = (selected: MultiValue<MultiSelectOption>) => {
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
                hint='Who should be able to subscribe to your site?'
                options={RECIPIENT_FILTER_OPTIONS}
                selectedOption={selectedOption}
                title="Default Newsletter recipients"
                onSelect={(value) => {
                    setDefaultRecipientValue(value);
                }}
            />
            {(selectedOption === 'segment') && (
                <MultiSelect
                    options={segmentOptionGroups.filter(group => group.options.length > 0)}
                    title='Select tiers'
                    values={selectedSegments}
                    clearBg
                    onChange={setSelectedSegments}
                />
            )}
        </SettingGroupContent>
    );

    return (
        <SettingGroup
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
        </SettingGroup>
    );
};

export default DefaultRecipients;
