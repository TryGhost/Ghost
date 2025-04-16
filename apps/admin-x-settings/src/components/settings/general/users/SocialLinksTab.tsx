import BehindFeatureFlag from '../../../BehindFeatureFlag';
import {SettingGroup, SettingGroupContent, TextField} from '@tryghost/admin-x-design-system';
import {UserDetailProps} from '../UserDetailModal';
import {
    blueskyHandleToUrl,
    blueskyUrlToHandle,
    facebookHandleToUrl,
    facebookUrlToHandle,
    instagramHandleToUrl,
    instagramUrlToHandle,
    linkedinHandleToUrl,
    linkedinUrlToHandle,
    mastodonHandleToUrl,
    mastodonUrlToHandle,
    threadsHandleToUrl,
    threadsUrlToHandle,
    tiktokHandleToUrl,
    tiktokUrlToHandle,
    twitterHandleToUrl,
    twitterUrlToHandle,
    validateBlueskyUrl,
    validateFacebookUrl,
    validateInstagramUrl,
    validateLinkedInUrl,
    validateMastodonUrl,
    validateThreadsUrl,
    validateTikTokUrl,
    validateTwitterUrl,
    validateYouTubeUrl,
    youtubeHandleToUrl,
    youtubeUrlToHandle
} from '../../../../utils/socialUrls/index';
import {useState} from 'react';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, clearError, validateField, user, setUserData}) => {
    const [facebookUrl, setFacebookUrl] = useState(user.facebook ? facebookHandleToUrl(user.facebook) : '');
    const [twitterUrl, setTwitterUrl] = useState(user.twitter ? twitterHandleToUrl(user.twitter) : '');
    const [threadsUrl, setThreadsUrl] = useState(user.threads ? threadsHandleToUrl(user.threads) : '');
    const [blueskyUrl, setBlueskyUrl] = useState(user.bluesky ? blueskyHandleToUrl(user.bluesky) : '');
    const [linkedinUrl, setLinkedinUrl] = useState(user.linkedin ? linkedinHandleToUrl(user.linkedin) : '');
    const [instagramUrl, setInstagramUrl] = useState(user.instagram ? instagramHandleToUrl(user.instagram) : '');
    const [youtubeUrl, setYoutubeUrl] = useState(user.youtube ? youtubeHandleToUrl(user.youtube) : '');
    const [tiktokUrl, setTiktokUrl] = useState(user.tiktok ? tiktokHandleToUrl(user.tiktok) : '');
    const [mastodonUrl, setMastodonUrl] = useState(user.mastodon ? mastodonHandleToUrl(user.mastodon) : '');

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
                // onBlur={(e) => {
                //     validateField('url', e.target.value);
                // }}
                onChange={(e) => {
                    setUserData({...user, website: e.target.value});
                }}
                onKeyDown={() => clearError('url')} />
            <TextField
                data-testid="x-input"
                error={!!errors?.twitter}
                hint={errors?.twitter}
                maxLength={2000}
                placeholder='https://x.com/username'
                title="X"
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
                data-testid="facebook-input"
                error={!!errors?.facebook}
                hint={errors?.facebook}
                maxLength={2000}
                placeholder='https://www.facebook.com/username'
                title="Facebook"
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
                    data-testid="linkedin-input"
                    error={!!errors?.linkedin}
                    hint={errors?.linkedin}
                    maxLength={2000}
                    placeholder='https://www.linkedin.com/in/username'
                    title="LinkedIn"
                    value={linkedinUrl}
                    onBlur={(e) => {
                        if (validateField('linkedin', e.target.value)) {
                            const url = validateLinkedInUrl(e.target.value);
                            setLinkedinUrl(url);
                            setUserData({...user, linkedin: linkedinUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setLinkedinUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('linkedin')} />
                <TextField
                    data-testid="bluesky-input"
                    error={!!errors?.bluesky}
                    hint={errors?.bluesky}
                    maxLength={2000}
                    placeholder='https://bsky.social/username'
                    title="Bluesky"
                    value={blueskyUrl}
                    onBlur={(e) => {
                        if (validateField('bluesky', e.target.value)) {
                            const url = validateBlueskyUrl(e.target.value);
                            setBlueskyUrl(url);
                            setUserData({...user, bluesky: blueskyUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setBlueskyUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('bluesky')} />
                <TextField
                    data-testid="threads-input"
                    error={!!errors?.threads}
                    hint={errors?.threads}
                    maxLength={2000}
                    placeholder='https://threads.net/@username'
                    title="Threads"
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
                <TextField
                    data-testid="mastodon-input"
                    error={!!errors?.mastodon}
                    hint={errors?.mastodon}
                    maxLength={2000}
                    placeholder='https://mastodon.social/@username'
                    title="Mastodon"
                    value={mastodonUrl}
                    onBlur={(e) => {
                        if (validateField('mastodon', e.target.value)) {
                            const url = validateMastodonUrl(e.target.value);
                            setMastodonUrl(url);
                            setUserData({...user, mastodon: mastodonUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setMastodonUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('mastodon')} />
                <TextField
                    data-testid="tiktok-input"
                    error={!!errors?.tiktok}
                    hint={errors?.tiktok}
                    maxLength={2000}
                    placeholder='https://www.tiktok.com/@username'
                    title="TikTok"
                    value={tiktokUrl}
                    onBlur={(e) => {
                        if (validateField('tiktok', e.target.value)) {
                            const url = validateTikTokUrl(e.target.value);
                            setTiktokUrl(url);
                            setUserData({...user, tiktok: tiktokUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setTiktokUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('tiktok')} />
                <TextField
                    data-testid="youtube-input"
                    error={!!errors?.youtube}
                    hint={errors?.youtube}
                    maxLength={2000}
                    placeholder='https://www.youtube.com/username'
                    title="YouTube"
                    value={youtubeUrl}
                    onBlur={(e) => {
                        if (validateField('youtube', e.target.value)) {
                            const url = validateYouTubeUrl(e.target.value);
                            setYoutubeUrl(url);
                            setUserData({...user, youtube: youtubeUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setYoutubeUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('youtube')} />
                <TextField
                    data-testid="instagram-input"
                    error={!!errors?.instagram}
                    hint={errors?.instagram}
                    maxLength={2000}
                    placeholder='https://www.instagram.com/username'
                    title="Instagram"
                    value={instagramUrl}
                    onBlur={(e) => {
                        if (validateField('instagram', e.target.value)) {
                            const url = validateInstagramUrl(e.target.value);
                            setInstagramUrl(url);
                            setUserData({...user, instagram: instagramUrlToHandle(url)});
                        }
                    }}
                    onChange={(e) => {
                        setInstagramUrl(e.target.value);
                    }}
                    onKeyDown={() => clearError('instagram')} />
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
