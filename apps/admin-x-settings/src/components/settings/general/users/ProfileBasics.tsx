import CustomHeader from './CustomHeader';
import RoleSelector from './RoleSelector';
import {SettingGroup, SettingGroupContent, TextField} from '@tryghost/admin-x-design-system';
import {UserDetailProps} from '../UserDetailModal';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const BasicInputs: React.FC<UserDetailProps> = ({errors, clearError, user, setUserData}) => {
    const {currentUser} = useGlobalData();

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.name}
                hint={errors?.name || 'Use real name so people can recognize you'}
                maxLength={191}
                title="Full name"
                value={user.name}
                onChange={(e) => {
                    setUserData({...user, name: e.target.value});
                }}
                onKeyDown={() => clearError('name')}
            />
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
            <TextField
                hint={`https://example.com/author/${user.slug}`}
                maxLength={191}
                title="Slug"
                value={user.slug}
                onChange={(e) => {
                    setUserData({...user, slug: e.target.value});
                }}
            />
            {hasAdminAccess(currentUser) && <RoleSelector setUserData={setUserData} user={user} />}
        </SettingGroupContent>
    );
};

const ProfileBasics: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Basic info</CustomHeader>}
            title='Basic'
        >
            <BasicInputs {...props} />
        </SettingGroup>
    );
};

export default ProfileBasics;
