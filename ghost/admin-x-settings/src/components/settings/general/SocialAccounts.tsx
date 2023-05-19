import React, {useContext, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import {SettingsContext} from '../../SettingsProvider';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';
import {getSettingValue} from '../../../utils/helpers';

const SocialAccounts: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const {settings, saveSettings} = useContext(SettingsContext) || {};
    const savedFacebookUser = getSettingValue(settings, 'facebook');
    const savedTwitterUser = getSettingValue(settings, 'twitter');
    let [, fbUser] = savedFacebookUser.match(/(\S+)/) || [];
    let [, twitterUser] = savedTwitterUser.match(/@?([^/]*)/) || [];

    const savedFacebookUrl = `https://www.facebook.com/${fbUser}`;
    const savedTwitterUrl = `https://twitter.com/${twitterUser}`;
    const [facebookUrl, setFacebookUrl] = useState(savedFacebookUrl);
    const [twitterUrl, setTwitterUrl] = useState(savedTwitterUrl);

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
        setCurrentState('unsaved');
        if (type === 'facebook') {
            setFacebookUrl(e.target.value);
        } else {
            setTwitterUrl(e.target.value);
        }
    };

    const inputs = (
        <SettingGroupContent>
            <TextField
                placeholder="https://www.facebook.com/ghost"
                title={`URL of your publication's Facebook Page`}
                value={facebookUrl}
                onChange={(e) => {
                    handleChange(e, 'facebook');
                }}
            />
            <TextField
                placeholder="https://twitter.com/ghost"
                title="URL of your Twitter profile"
                value={twitterUrl}
                onChange={(e) => {
                    handleChange(e, 'twitter');
                }}
            />
        </SettingGroupContent>
    );

    const handleSave = () => {
        let [, facebookUser] = facebookUrl.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi) || [];
        let [, twUser] = twitterUrl.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^/]*)/) || [];
        saveSettings?.([
            {
                key: 'facebook',
                value: facebookUser
            },
            {
                key: 'twitter',
                value: `@${twUser}`
            }
        ]);
        setCurrentState('view');
    };

    return (
        <SettingGroup
            description='Link your social accounts for full structured data and rich card support'
            state={currentState}
            title='Social accounts'
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default SocialAccounts;