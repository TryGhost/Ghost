import {SOCIAL_PLATFORM_CONFIGS, normalizeSocialInput} from '../../../../utils/social-urls/index';
import {SettingGroup, SettingGroupContent, TextField} from '@tryghost/admin-x-design-system';
import {type UserDetailProps} from '../user-detail-modal';
import {useState} from 'react';
import type {SocialPlatformKey} from '../../../../utils/social-urls/index';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, clearError, validateField, user, setUserData}) => {
    const [urls, setUrls] = useState<Record<SocialPlatformKey, string>>(() => {
        return Object.fromEntries(SOCIAL_PLATFORM_CONFIGS.map((config) => {
            const value = user[config.key];
            return [config.key, config.toDisplayValue(value)];
        })) as Record<SocialPlatformKey, string>;
    });

    return (
        <SettingGroupContent>
            <TextField
                data-testid="website-input"
                error={!!errors?.website}
                hint={errors?.website}
                maxLength={2000}
                placeholder='https://example.com'
                title="Website"
                value={user.website || ''}
                onChange={(event) => {
                    setUserData({...user, website: event.target.value});
                }}
                onKeyDown={() => clearError('url')} />
            {SOCIAL_PLATFORM_CONFIGS.map(config => (
                <TextField
                    key={config.key}
                    data-testid={config.testId}
                    error={!!errors?.[config.key]}
                    hint={errors?.[config.key]}
                    maxLength={2000}
                    placeholder={config.placeholder}
                    title={config.staffTitle}
                    value={urls[config.key]}
                    onBlur={(event) => {
                        if (validateField(config.key, event.target.value)) {
                            const {displayValue, storedValue} = normalizeSocialInput(config.key, event.target.value);
                            setUrls(current => ({...current, [config.key]: displayValue}));
                            setUserData({...user, [config.key]: storedValue});
                        }
                    }}
                    onChange={(event) => {
                        setUrls(current => ({...current, [config.key]: event.target.value}));
                    }}
                    onKeyDown={() => clearError(config.key)} />
            ))}
        </SettingGroupContent>
    );
};

const SocialLinksTab: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup border={false}>
            <DetailsInputs {...props} />
        </SettingGroup>
    );
};

export default SocialLinksTab;
