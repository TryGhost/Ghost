import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {facebookHandleToUrl, facebookUrlToHandle, twitterHandleToUrl, twitterUrlToHandle, validateFacebookUrl, validateTwitterUrl} from '../../../utils/socialUrls';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

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

    const [errors, setErrors] = useState<{
        facebook?: string;
        twitter?: string;
    }>({});

    const [facebookHandle, twitterHandle] = getSettingValues<string | null>(localSettings, ['facebook', 'twitter']);

    const [facebookUrl, setFacebookUrl] = useState(facebookHandle ? facebookHandleToUrl(facebookHandle) : '');
    const [twitterUrl, setTwitterUrl] = useState(twitterHandle ? twitterHandleToUrl(twitterHandle) : '');

    // Update local state when settings change (e.g., after cancel)
    useEffect(() => {
        setFacebookUrl(facebookHandle ? facebookHandleToUrl(facebookHandle) : '');
        setTwitterUrl(twitterHandle ? twitterHandleToUrl(twitterHandle) : '');
    }, [facebookHandle, twitterHandle]);

    const handleFacebookChange = (value: string) => {
        setFacebookUrl(value);
        try {
            const newUrl = validateFacebookUrl(value);
            updateSetting('facebook', facebookUrlToHandle(newUrl));
            if (!isEditing) {
                handleEditingChange(true);
            }
            if (errors.facebook) {
                setErrors({...errors, facebook: ''});
            }
        } catch (err) {
            if (err instanceof Error) {
                setErrors({...errors, facebook: err.message});
            }
            updateSetting('facebook', null);
        }
    };

    const handleTwitterChange = (value: string) => {
        setTwitterUrl(value);
        try {
            const newUrl = validateTwitterUrl(value);
            updateSetting('twitter', twitterUrlToHandle(newUrl));
            if (!isEditing) {
                handleEditingChange(true);
            }
            if (errors.twitter) {
                setErrors({...errors, twitter: ''});
            }
        } catch (err) {
            if (err instanceof Error) {
                setErrors({...errors, twitter: err.message});
            }
            updateSetting('twitter', null);
        }
    };

    const handleSaveClick = () => {
        const formErrors: {
            facebook?: string;
            twitter?: string;
        } = {};

        if (facebookUrl) {
            try {
                validateFacebookUrl(facebookUrl);
            } catch (e) {
                if (e instanceof Error) {
                    formErrors.facebook = e.message;
                }
            }
        }

        if (twitterUrl) {
            try {
                validateTwitterUrl(twitterUrl);
            } catch (e) {
                if (e instanceof Error) {
                    formErrors.twitter = e.message;
                }
            }
        }

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
                <TextField
                    error={!!errors.facebook}
                    hint={errors.facebook}
                    placeholder="https://www.facebook.com/ghost"
                    title={`URL of your publication's Facebook Page`}
                    value={facebookUrl}
                    onChange={e => handleFacebookChange(e.target.value)}
                />
                <TextField
                    error={!!errors.twitter}
                    hint={errors.twitter}
                    placeholder="https://x.com/ghost"
                    title="URL of your X (formerly Twitter) profile"
                    value={twitterUrl}
                    onChange={e => handleTwitterChange(e.target.value)}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SocialAccounts, 'Social accounts');
