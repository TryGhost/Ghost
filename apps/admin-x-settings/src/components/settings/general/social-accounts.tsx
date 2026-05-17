import React, {useEffect, useMemo, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SOCIAL_PLATFORM_CONFIGS, SOCIAL_PLATFORM_KEYS, getSocialValidationError, normalizeSocialInput} from '../../../utils/social-urls';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import type {Setting} from '@tryghost/admin-x-framework/api/settings';
import type {SocialPlatformKey} from '../../../utils/social-urls';

const LEGACY_PLATFORM_KEYS: SocialPlatformKey[] = ['facebook', 'twitter'];
const NEW_PLATFORM_KEYS: SocialPlatformKey[] = SOCIAL_PLATFORM_KEYS.filter(
    key => !LEGACY_PLATFORM_KEYS.includes(key)
);

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

    const handles = getSettingValues<string | null>(localSettings, [...SOCIAL_PLATFORM_KEYS]);
    const backendSupportsNewPlatforms = NEW_PLATFORM_KEYS.some(key => localSettings?.some(s => s.key === key));

    const visiblePlatforms = useMemo(() => {
        return backendSupportsNewPlatforms
            ? SOCIAL_PLATFORM_CONFIGS
            : SOCIAL_PLATFORM_CONFIGS.filter(config => LEGACY_PLATFORM_KEYS.includes(config.key));
    }, [backendSupportsNewPlatforms]);

    // Depend on stored values, not the localSettings reference (which churns on every updateSetting).
    useEffect(() => {
        setUrls(getSocialUrls(localSettings));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handles.map(value => value ?? '').join('|')]);

    const handleSocialChange = (key: SocialPlatformKey, value: string) => {
        // Keep the display value in sync with the input (don't clear on validate error)
        setUrls(current => ({...current, [key]: value}));

        // Validate the input value
        const error = getSocialValidationError(key, value);
        
        if (!error && value.trim()) {
            // Valid input: extract the stored value and update the setting
            try {
                const {storedValue} = normalizeSocialInput(key, value);
                updateSetting(key, storedValue);
                setErrors(current => ({...current, [key]: ''}));
            } catch {
                // If normalizeSocialInput still throws after our check, show error
                setErrors(current => ({...current, [key]: getSocialValidationError(key, value)}));
            }
        } else if (!value.trim()) {
            // Empty input: clear the setting and error
            updateSetting(key, null);
            setErrors(current => ({...current, [key]: ''}));
        } else {
            // Invalid but not empty: show error but keep the input visible
            setErrors(current => ({...current, [key]: error}));
        }

        if (!isEditing) {
            handleEditingChange(true);
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
