import React from 'react';
import Select from '../../../admin-x-ds/global/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getOptionLabel} from '../../../utils/helpers';

const MEMBERS_SIGNUP_ACCESS_OPTIONS = [
    {value: 'all', label: 'Anyone can sign up'},
    {value: 'invite', label: 'Only people I invite'},
    {value: 'none', label: 'Nobody'}
];

const DEFAULT_CONTENT_VISIBILITY_OPTIONS = [
    {value: 'public', label: 'Public'},
    {value: 'members', label: 'Members only'},
    {value: 'paid', label: 'Paid-members only'},
    {value: 'tiers', label: 'Specific tiers'}
];

const COMMENTS_ENABLED_OPTIONS = [
    {value: 'all', label: 'All members'},
    {value: 'paid', label: 'Paid-members only'},
    {value: 'off', label: 'Nobody'}
];

const Access: React.FC = () => {
    const {
        currentState,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [membersSignupAccess, defaultContentVisibility, commentsEnabled] = getSettingValues([
        'members_signup_access', 'default_content_visibility', 'comments_enabled'
    ]) as string[];

    const membersSignupAccessLabel = getOptionLabel(MEMBERS_SIGNUP_ACCESS_OPTIONS, membersSignupAccess);
    const defaultContentVisibilityLabel = getOptionLabel(DEFAULT_CONTENT_VISIBILITY_OPTIONS, defaultContentVisibility);
    const commentsEnabledLabel = getOptionLabel(COMMENTS_ENABLED_OPTIONS, commentsEnabled);

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
                defaultSelectedOption={membersSignupAccess}
                hint='Who should be able to subscribe to your site?'
                options={MEMBERS_SIGNUP_ACCESS_OPTIONS}
                title="Subscription access"
                onSelect={(value) => {
                    updateSetting('members_signup_access', value);
                }}
            />
            <Select
                defaultSelectedOption={defaultContentVisibility}
                hint='When a new post is created, who should have access?'
                options={DEFAULT_CONTENT_VISIBILITY_OPTIONS}
                title="Default post access"
                onSelect={(value) => {
                    updateSetting('default_content_visibility', value);
                }}
            />
            <Select
                defaultSelectedOption={commentsEnabled}
                hint='Who can comment on posts?'
                options={COMMENTS_ENABLED_OPTIONS}
                title="Commenting"
                onSelect={(value) => {
                    updateSetting('comments_enabled', value);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Set up default access options for subscription and posts'
            navid='access'
            saveState={saveState}
            state={currentState}
            title='Access'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : form}
        </SettingGroup>
    );
};

export default Access;