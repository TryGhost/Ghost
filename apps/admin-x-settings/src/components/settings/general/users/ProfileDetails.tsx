import CustomHeader from './CustomHeader';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {UserDetailProps} from '../UserDetailModal';
import {facebookHandleToUrl, facebookUrlToHandle, twitterHandleToUrl, twitterUrlToHandle, validateFacebookUrl, validateTwitterUrl} from '../../../../utils/socialUrls';
import {useState} from 'react';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, clearError, validators, user, setUserData}) => {
    const [facebookUrl, setFacebookUrl] = useState(user.facebook ? facebookHandleToUrl(user.facebook) : '');
    const [twitterUrl, setTwitterUrl] = useState(user.twitter ? twitterHandleToUrl(user.twitter) : '');

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.location}
                hint={errors?.location || 'Where in the world do you live?'}
                title="Location"
                value={user.location || ''}
                onBlur={(e) => {
                    validators.location({location: e.target.value});
                }}
                onChange={(e) => {
                    setUserData({...user, location: e.target.value});
                }}
                onKeyDown={() => clearError('location')} />
            <TextField
                error={!!errors?.url}
                hint={errors?.url || 'Have a website or blog other than this one? Link it!'}
                title="Website"
                value={user.website || ''}
                onBlur={(e) => {
                    validators.url({url: e.target.value});
                }}
                onChange={(e) => {
                    setUserData({...user, website: e.target.value});
                }}
                onKeyDown={() => clearError('url')} />
            <TextField
                error={!!errors?.facebook}
                hint={errors?.facebook || 'URL of your personal Facebook Profile'}
                title="Facebook profile"
                value={facebookUrl}
                onBlur={(e) => {
                    if (validators.facebook({facebook: e.target.value})) {
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
                title="X (formerly Twitter) profile"
                value={twitterUrl}
                onBlur={(e) => {
                    if (validators.twitter({twitter: e.target.value})) {
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
                title="Bio"
                value={user.bio || ''}
                onBlur={(e) => {
                    validators.bio({bio: e.target.value});
                }}
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
