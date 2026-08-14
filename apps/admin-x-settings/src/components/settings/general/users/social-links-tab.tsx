import {Field, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {SOCIAL_PLATFORM_CONFIGS, normalizeSocialInput} from '../../../../utils/social-urls/index';
import {SettingGroup, SettingGroupContent} from '@tryghost/shade/patterns';
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
        <SettingGroupContent className='[&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
            <Field data-invalid={Boolean(errors?.website) || undefined}>
                <FieldLabel htmlFor='staff-website'>Website</FieldLabel>
                <Input
                    aria-invalid={Boolean(errors?.website) || undefined}
                    data-testid='website-input'
                    id='staff-website'
                    maxLength={2000}
                    placeholder='https://example.com'
                    value={user.website || ''}
                    onChange={(event) => {
                        setUserData({...user, website: event.target.value});
                    }}
                    onKeyDown={() => clearError('website')}
                />
                {errors?.website && <FieldError>{errors.website}</FieldError>}
            </Field>
            {SOCIAL_PLATFORM_CONFIGS.map(config => (
                <Field key={config.key} data-invalid={Boolean(errors?.[config.key]) || undefined}>
                    <FieldLabel htmlFor={`staff-${config.key}`}>{config.staffTitle}</FieldLabel>
                    <Input
                        aria-invalid={Boolean(errors?.[config.key]) || undefined}
                        data-testid={config.testId}
                        id={`staff-${config.key}`}
                        maxLength={2000}
                        placeholder={config.placeholder}
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
                        onKeyDown={() => clearError(config.key)}
                    />
                    {errors?.[config.key] && <FieldError>{errors[config.key]}</FieldError>}
                </Field>
            ))}
        </SettingGroupContent>
    );
};

const SocialLinksTab: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup variant='plain'>
            <DetailsInputs {...props} />
        </SettingGroup>
    );
};

export default SocialLinksTab;
