import ChangePasswordForm from './ChangePasswordForm';
import RoleSelector from './RoleSelector';
import StaffToken from './StaffToken';
import {SettingGroup, SettingGroupContent, TextArea, TextField} from '@tryghost/admin-x-design-system';
import {UserDetailProps} from '../UserDetailModal';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const BasicInputs: React.FC<UserDetailProps> = ({errors, clearError, user, setUserData}) => {
    const {currentUser} = useGlobalData();

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.email}
                hint={errors?.email || 'Used for notifications'}
                maxLength={191}
                title="Email"
                value={user.email}
                onChange={(e) => {
                    setUserData({...user, email: e.target.value});
                }}
                onKeyDown={() => clearError('email')}
            />
            <ChangePasswordForm user={user} />
            {hasAdminAccess(currentUser) && <RoleSelector setUserData={setUserData} user={user} />}
            <TextField
                error={!!errors?.name}
                hint={errors?.name || 'Use your real name so people can recognize you'}
                maxLength={191}
                title="Full name"
                value={user.name}
                onChange={(e) => {
                    setUserData({...user, name: e.target.value});
                }}
                onKeyDown={() => clearError('name')}
            />
            <TextField
                hint={`https://example.com/author/${user.slug}`}
                maxLength={191}
                title="Slug"
                value={user.slug}
                onChange={(e) => {
                    setUserData({...user, slug: e.target.value});
                }}
            />
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
            {user.id === currentUser.id && <StaffToken />}
        </SettingGroupContent>
    );
};

const ProfileTab: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup border={false}>
            <BasicInputs {...props} />
        </SettingGroup>
    );
};

export default ProfileTab;
