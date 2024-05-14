import CustomHeader from './CustomHeader';
import {SettingGroup, SettingGroupContent, TextArea, TextField} from '@tryghost/admin-x-design-system';
import {UserDetailProps} from '../UserDetailModal';
import {facebookHandleToUrl, facebookUrlToHandle, twitterHandleToUrl, twitterUrlToHandle, validateFacebookUrl, validateTwitterUrl} from '../../../../utils/socialUrls';

import {useState} from 'react';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, clearError, validateField, user, setUserData}) => {
    const [facebookUrl, setFacebookUrl] = useState(user.facebook ? facebookHandleToUrl(user.facebook) : '');
    const [twitterUrl, setTwitterUrl] = useState(user.twitter ? twitterHandleToUrl(user.twitter) : '');

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.location}
                hint={errors?.location || 'Where in the world do you live?'}
                maxLength={65535}
                title="Location"
                value={user.location || ''}
                onChange={(e) => {
                    setUserData({...user, location: e.target.value});
                }}
                onKeyDown={() => clearError('location')} />
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
                error={!!errors?.facebook}
                hint={errors?.facebook || 'URL of your personal Facebook Profile'}
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
            <TextField
                error={!!errors?.twitter}
                hint={errors?.twitter || 'URL of your X profile'}
                maxLength={2000}
                title="X (formerly Twitter) profile"
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
            <TextArea
                error={!!errors?.bio}
                hint={errors?.bio || <>Recommended: 200 characters. You&lsquo;ve used <span className='font-bold'>{user.bio?.length || 0}</span></>}
                maxLength={65535}
                title="Bio"
                value={user.bio || ''}
                onChange={(e) => {
                    setUserData({...user, bio: e.target.value});
                }}
                onKeyDown={() => clearError('bio')} />
        </SettingGroupContent>
    );
};

const ProfileDetails: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Details</CustomHeader>}
            title='Details'
        >
            <DetailsInputs {...props} />
        </SettingGroup>
    );
};

export default ProfileDetails;
