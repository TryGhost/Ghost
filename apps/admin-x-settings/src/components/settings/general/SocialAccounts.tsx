import React, {useRef, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';
import validator from 'validator';
import {getSettingValues} from '../../../utils/helpers';

function validateFacebookUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.facebook.com/yourPage';
    if (!newUrl) {
        return '';
    }

    // strip any facebook URLs out
    newUrl = newUrl.replace(/(https?:\/\/)?(www\.)?facebook\.com/i, '');

    // don't allow any non-facebook urls
    if (newUrl.match(/^(http|\/\/)/i)) {
        throw new Error(errMessage);
    }

    // strip leading / if we have one then concat to full facebook URL
    newUrl = newUrl.replace(/^\//, '');
    newUrl = `https://www.facebook.com/${newUrl}`;

    // don't allow URL if it's not valid
    if (!validator.isURL(newUrl)) {
        throw new Error(errMessage);
    }

    return newUrl;
}

function validateTwitterUrl(newUrl: string) {
    if (!newUrl) {
        return '';
    }
    if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
        let username = [];

        if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
            [, username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
        } else {
            [username] = newUrl.match(/([^/]+)\/?$/mi);
        }

        // check if username starts with http or www and show error if so
        if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d._]{1,15}$/mi)) {
            const message = !username.match(/^[a-z\d._]{1,15}$/mi)
                ? 'Your Username is not a valid Twitter Username'
                : 'The URL must be in a format like https://twitter.com/yourUsername';
            throw new Error(message);
        }
        return `https://twitter.com/${username}`;
    } else {
        const message = 'The URL must be in a format like https://twitter.com/yourUsername';
        throw new Error(message);
    }
}

const SocialAccounts: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        focusRef,
        handleEditingChange
    } = useSettingGroup();

    const [errors, setErrors] = useState<{
        facebook?: string;
        twitter?: string;
    }>({});

    const twitterInputRef = useRef<HTMLInputElement>(null);

    const [facebookUrl, twitterUrl] = getSettingValues(localSettings, ['facebook', 'twitter']) as string[];

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: `URL of your publication's Facebook Page`,
                    key: 'facebook',
                    value: facebookUrl
                },
                {
                    heading: 'URL of your TWITTER PROFILE',
                    key: 'twitter',
                    value: twitterUrl
                }
            ]}
        />
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type:'facebook' | 'twitter') => {
        if (type === 'facebook') {
            updateSetting('facebook', e.target.value);
        } else {
            updateSetting('twitter', e.target.value);
        }
    };

    const inputs = (
        <SettingGroupContent>
            <TextField
                error={!!errors.facebook}
                hint={errors.facebook}
                inputRef={focusRef}
                placeholder="https://www.facebook.com/ghost"
                title={`URL of your publication's Facebook Page`}
                value={facebookUrl}
                onBlur={(e) => {
                    try {
                        const newUrl = validateFacebookUrl(e.target.value);
                        updateSetting('facebook', newUrl);
                        if (focusRef.current) {
                            focusRef.current.value = newUrl;
                        }
                    } catch (err: any) {
                        // ignore error
                    }
                }}
                onChange={(e) => {
                    handleChange(e, 'facebook');
                }}
            />
            <TextField
                error={!!errors.twitter}
                hint={errors.twitter}
                inputRef={twitterInputRef}
                placeholder="https://twitter.com/ghost"
                title="URL of your Twitter profile"
                value={twitterUrl}
                onBlur={(e) => {
                    try {
                        const newUrl = validateTwitterUrl(e.target.value);
                        updateSetting('twitter', newUrl);
                        if (twitterInputRef.current) {
                            twitterInputRef.current.value = newUrl;
                        }
                    } catch (err: any) {
                        // ignore error
                    }
                }}
                onChange={(e) => {
                    handleChange(e, 'twitter');
                }}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Link your social accounts for full structured data and rich card support'
            isEditing={isEditing}
            keywords={keywords}
            navid='social-accounts'
            saveState={saveState}
            testId='social-accounts'
            title='Social accounts'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={() => {
                const formErrors: {
                    facebook?: string;
                    twitter?: string;
                } = {};
                try {
                    validateFacebookUrl(facebookUrl);
                } catch (e: any) {
                    formErrors.facebook = e?.message;
                }

                try {
                    validateTwitterUrl(twitterUrl);
                } catch (e: any) {
                    formErrors.twitter = e?.message;
                }

                setErrors(formErrors);
                if (Object.keys(formErrors).length === 0) {
                    handleSave();
                }
            }}
        >
            {isEditing ? inputs : values}
        </SettingGroup>
    );
};

export default SocialAccounts;
