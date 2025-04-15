import BehindFeatureFlag from '../../../BehindFeatureFlag';
import {SettingGroup, SettingGroupContent, TextField} from '@tryghost/admin-x-design-system';
import {UserDetailProps} from '../UserDetailModal';
import {facebookHandleToUrl, facebookUrlToHandle, threadsHandleToUrl, threadsUrlToHandle, twitterHandleToUrl, twitterUrlToHandle, validateFacebookUrl, validateThreadsUrl, validateTwitterUrl} from '../../../../utils/socialUrls';
import {useState} from 'react';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, clearError, validateField, user, setUserData}) => {
    const [facebookUrl, setFacebookUrl] = useState(user.facebook ? facebookHandleToUrl(user.facebook) : '');
    const [twitterUrl, setTwitterUrl] = useState(user.twitter ? twitterHandleToUrl(user.twitter) : '');
    const [threadsUrl, setThreadsUrl] = useState(user.threads ? threadsHandleToUrl(user.threads) : '');
    // const [blueskyUrl, setBlueskyUrl] = useState(user.bluesky ? twitterHandleToUrl(user.bluesky) : '');
    // const [mastodonUrl, setMastodonUrl] = useState(user.mastodon ? twitterHandleToUrl(user.mastodon) : '');
    // const [tiktokUrl, setTiktokUrl] = useState(user.tiktok ? twitterHandleToUrl(user.tiktok) : '');
    // const [youtubeUrl, setYoutubeUrl] = useState(user.youtube ? twitterHandleToUrl(user.youtube) : '');
    // const [instagramUrl, setInstagramUrl] = useState(user.instagram ? twitterHandleToUrl(user.instagram) : '');
    
    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.website}
                hint={errors?.website || 'Have a website or blog other than this one? Link it!'}
                maxLength={2000}
                title="Website"
                value={user.website || ''}
                // onBlur={(e) => {
                //     validateField('url', e.target.value);
                // }}
                onChange={(e) => {
                    setUserData({...user, website: e.target.value});
                }}
                onKeyDown={() => clearError('url')} />
            <TextField
                error={!!errors?.twitter}
                hint={errors?.twitter}
                maxLength={2000}
                title="X profile"
                value={twitterUrl}
                onBlur={(e) => {
                    if (validateField('twitter', e.target.value)) {
                        const url = validateTwitterUrl(e.target.value);
                        setTwitterUrl(url);
                        setUserData({...user, twitter: twitterUrlToHandle(url)});
                    }
                }}
                onChange={(e) => {
                    setTwitterUrl(e.target.value);
                }}
                onKeyDown={() => clearError('twitter')} />
            <TextField
                error={!!errors?.facebook}
                hint={errors?.facebook}
                maxLength={2000}
                title="Facebook profile"
                value={facebookUrl}
                onBlur={(e) => {
                    if (validateField('facebook', e.target.value)) {
                        const url = validateFacebookUrl(e.target.value);
                        setFacebookUrl(url);
                        setUserData({...user, facebook: facebookUrlToHandle(url)});
                    }
                }}
                onChange={(e) => {
                    setFacebookUrl(e.target.value);
                }}
                onKeyDown={() => clearError('facebook')} />
            <BehindFeatureFlag flag='socialLinks'>
                <TextField
                    error={!!errors?.threads}
                    hint={errors?.threads}
                    maxLength={2000}
                    title="Threads profile"
                    value={threadsUrl}
                    onBlur={(e) => {
                        if (validateField('threads', e.target.value)) {
                            const url = validateThreadsUrl(e.target.value);
                            setThreadsUrl(url);
                            setUserData({...user, threads: threadsUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setThreadsUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('threads')} />
            </BehindFeatureFlag>
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
