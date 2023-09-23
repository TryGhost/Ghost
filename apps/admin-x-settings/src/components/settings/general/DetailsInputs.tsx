import React from 'react';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../admin-x-ds/global/form/TextField';
import {UserDetailProps} from './UserDetailModal';

export const DetailsInputs: React.FC<UserDetailProps> = ({errors, validators, user, setUserData}) => {
    return (
        <SettingGroupContent>
            <TextField
                hint="Where in the world do you live?"
                title="Location"
                value={user.location}
                onChange={(e) => {
                    setUserData?.({...user, location: e.target.value});
                }} />
            <TextField
                error={!!errors?.url}
                hint={errors?.url || 'Have a website or blog other than this one? Link it!'}
                title="Website"
                value={user.website}
                onBlur={(e) => {
                    validators?.url(e.target.value);
                }}
                onChange={(e) => {
                    setUserData?.({...user, website: e.target.value});
                }} />
            <TextField
                hint='URL of your personal Facebook Profile'
                title="Facebook profile"
                value={user.facebook}
                onChange={(e) => {
                    setUserData?.({...user, facebook: e.target.value});
                }} />
            <TextField
                hint='URL of your personal Twitter profile'
                title="Twitter profile"
                value={user.twitter}
                onChange={(e) => {
                    setUserData?.({...user, twitter: e.target.value});
                }} />
            <TextArea
                hint={<>Recommended: 200 characters. You&lsquo;ve used <span className='font-bold'>{user.bio?.length || 0}</span></>}
                title="Bio"
                value={user.bio || ''}
                onChange={(e) => {
                    setUserData?.({...user, bio: e.target.value});
                }} />
        </SettingGroupContent>
    );
};
