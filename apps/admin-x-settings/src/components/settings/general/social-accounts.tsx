import React, {useEffect, useMemo, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SOCIAL_PLATFORM_CONFIGS, SOCIAL_PLATFORM_KEYS, getSocialValidationError, normalizeSocialInput} from '../../../utils/social-urls';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import type {Setting} from '@tryghost/admin-x-framework/api/settings';
import type {SocialPlatformKey} from '../../../utils/social-urls';

// facebook + twitter are the original publication-level social settings;
// the other 7 ship with the backend in a separate release. Use the presence
// of `linkedin` in the API response as a canary for "backend has the new
// settings" — the migration adds all 7 in one transaction, so any one of
// them works as the signal. Without this gate, an admin running ahead of
// its backend would render fields, accept user input, and silently lose
// the value on save (the backend drops unknown keys without erroring).
const LEGACY_PLATFORM_KEYS: SocialPlatformKey[] = ['facebook', 'twitter'];
const CAPABILITY_CANARY_KEY = 'linkedin';

const getSocialUrls = (localSettings: Setting[] | null) => {
    const socialHandles = getSettingValues<string | null>(localSettings, [...SOCIAL_PLATFORM_KEYS]);

    return Object.fromEntries(SOCIAL_PLATFORM_CONFIGS.map((config, index) => {
        const value = socialHandles[index];
        return [config.key, config.toDisplayValue(value)];
    })) as Record<SocialPlatformKey, string>;
};

const SocialAccounts: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [errors, setErrors] = useState<Partial<Record<SocialPlatformKey, string>>>({});
    const [urls, setUrls] = useState<Record<SocialPlatformKey, string>>(() => getSocialUrls(localSettings));

    const visiblePlatforms = useMemo(() => {
        const backendSupportsNewPlatforms = localSettings?.some(s => s.key === CAPABILITY_CANARY_KEY) ?? false;
        return backendSupportsNewPlatforms
            ? SOCIAL_PLATFORM_CONFIGS
            : SOCIAL_PLATFORM_CONFIGS.filter(config => LEGACY_PLATFORM_KEYS.includes(config.key));
    }, [localSettings]);

    useEffect(() => {
        setUrls(getSocialUrls(localSettings));
    }, [localSettings]);

    const handleSocialChange = (key: SocialPlatformKey, value: string) => {
        setUrls(current => ({...current, [key]: value}));

        try {
            const {storedValue} = normalizeSocialInput(key, value);
            updateSetting(key, storedValue);

            if (!isEditing) {
                handleEditingChange(true);
            }

            if (errors[key]) {
                setErrors(current => ({...current, [key]: ''}));
            }
        } catch {
            setErrors(current => ({...current, [key]: getSocialValidationError(key, value)}));
            updateSetting(key, null);
        }
    };

    const handleSaveClick = () => {
        const formErrors = visiblePlatforms.reduce<Partial<Record<SocialPlatformKey, string>>>((current, config) => {
            const error = getSocialValidationError(config.key, urls[config.key]);
            if (error) {
                current[config.key] = error;
            }
            return current;
        }, {});

        setErrors(formErrors);

        if (Object.keys(formErrors).length === 0) {
            handleSave();
        }
    };

    return (
        <TopLevelGroup
            description='Link your social accounts for full structured data and rich card support'
            isEditing={isEditing}
            keywords={keywords}
            navid='social-accounts'
            saveState={saveState}
            testId='social-accounts'
            title='Social accounts'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSaveClick}
        >
            <SettingGroupContent>
                {visiblePlatforms.map(config => (
                    <TextField
                        key={config.key}
                        data-testid={config.testId}
                        error={!!errors[config.key]}
                        hint={errors[config.key]}
                        placeholder={config.placeholder}
                        title={config.publicationTitle}
                        value={urls[config.key]}
                        onChange={event => handleSocialChange(config.key, event.target.value)}
                    />
                ))}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SocialAccounts, 'Social accounts');
