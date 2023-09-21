import MultiSelect, {MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import React from 'react';
import Select from '../../../admin-x-ds/global/form/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {GroupBase, MultiValue} from 'react-select';
import {getOptionLabel} from '../../../utils/helpers';
import {getSettingValues} from '../../../api/settings';
import {useBrowseTiers} from '../../../api/tiers';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const MEMBERS_SIGNUP_ACCESS_OPTIONS = [
    {
        value: 'all',
        label: 'Anyone can sign up',
        hint: 'All visitors will be able to subscribe and sign in'
    },
    {
        value: 'invite',
        label: 'Only people I invite',
        hint: 'People can sign in from your site but won\'t be able to sign up'
    },
    {
        value: 'none',
        label: 'Nobody',
        hint: 'Disable all member features, including newsletters'
    }
];

const DEFAULT_CONTENT_VISIBILITY_OPTIONS = [
    {
        value: 'public',
        label: 'Public',
        hint: 'All site visitors to your site, no login required'
    },
    {
        value: 'members',
        label: 'Members only',
        hint: 'All logged-in members'
    },
    {
        value: 'paid',
        label: 'Paid-members only',
        hint: 'Only logged-in members with an active Stripe subscription'
    },
    {
        value: 'tiers',
        label: 'Specific tiers',
        hint: 'Members with any of the selected tiers'
    }
];

const COMMENTS_ENABLED_OPTIONS = [
    {
        value: 'all',
        label: 'All members',
        hint: 'Logged-in members'
    },
    {
        value: 'paid',
        label: 'Paid-members only',
        hint: 'Only logged-in members with an active Stripe subscription'
    },
    {
        value: 'off',
        label: 'Nobody',
        hint: 'Disable commenting completely'
    }
];

const Access: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [membersSignupAccess, defaultContentVisibility, defaultContentVisibilityTiers, commentsEnabled] = getSettingValues(localSettings, [
        'members_signup_access', 'default_content_visibility', 'default_content_visibility_tiers', 'comments_enabled'
    ]) as string[];

    const membersSignupAccessLabel = getOptionLabel(MEMBERS_SIGNUP_ACCESS_OPTIONS, membersSignupAccess);
    const defaultContentVisibilityLabel = getOptionLabel(DEFAULT_CONTENT_VISIBILITY_OPTIONS, defaultContentVisibility);
    const commentsEnabledLabel = getOptionLabel(COMMENTS_ENABLED_OPTIONS, commentsEnabled);

    const {data: {tiers} = {}} = useBrowseTiers();

    const tierOptionGroups: GroupBase<MultiSelectOption>[] = [
        {
            label: 'Active Tiers',
            options: tiers?.filter(({active}) => active).map(tier => ({value: tier.id, label: tier.name})) || []
        },
        {
            label: 'Archived Tiers',
            options: tiers?.filter(({active}) => !active).map(tier => ({value: tier.id, label: tier.name})) || []
        }
    ];

    const contentVisibilityTiers = JSON.parse(defaultContentVisibilityTiers || '[]') as string[];
    const selectedTierOptions = tierOptionGroups.flatMap(group => group.options).filter(option => contentVisibilityTiers.includes(option.value));

    const setSelectedTiers = (selectedOptions: MultiValue<MultiSelectOption>) => {
        const selectedTiers = selectedOptions.map(option => option.value);
        updateSetting('default_content_visibility_tiers', JSON.stringify(selectedTiers));
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Subscription access',
                    key: 'subscription-access',
                    value: membersSignupAccessLabel
                },
                {
                    heading: 'Default post access',
                    key: 'default-post-access',
                    value: defaultContentVisibilityLabel
                },
                {
                    heading: 'Commenting',
                    key: 'commenting',
                    value: commentsEnabledLabel
                }
            ]}
        />
    );

    const form = (
        <SettingGroupContent columns={1}>
            <Select
                hint='Who should be able to subscribe to your site?'
                options={MEMBERS_SIGNUP_ACCESS_OPTIONS}
                selectedOption={membersSignupAccess}
                title="Subscription access"
                onSelect={(value) => {
                    updateSetting('members_signup_access', value || null);
                }}
            />
            <Select
                hint='When a new post is created, who should have access?'
                options={DEFAULT_CONTENT_VISIBILITY_OPTIONS}
                selectedOption={defaultContentVisibility}
                title="Default post access"
                onSelect={(value) => {
                    updateSetting('default_content_visibility', value || null);
                }}
            />
            {defaultContentVisibility === 'tiers' && (
                <MultiSelect
                    color='black'
                    options={tierOptionGroups.filter(group => group.options.length > 0)}
                    title='Select tiers'
                    values={selectedTierOptions}
                    clearBg
                    onChange={setSelectedTiers}
                />
            )}
            <Select
                hint='Who can comment on posts?'
                options={COMMENTS_ENABLED_OPTIONS}
                selectedOption={commentsEnabled}
                title="Commenting"
                onSelect={(value) => {
                    updateSetting('comments_enabled', value || null);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Set up default access options for subscription and posts'
            isEditing={isEditing}
            keywords={keywords}
            navid='access'
            saveState={saveState}
            testId='access'
            title='Access'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? form : values}
        </SettingGroup>
    );
};

export default withErrorBoundary(Access, 'Access');
