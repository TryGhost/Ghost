import CustomHeader from './CustomHeader';
import RoleSelector from './RoleSelector';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {UserDetailProps} from '../UserDetailModal';
import {hasAdminAccess} from '../../../../api/users';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const BasicInputs: React.FC<UserDetailProps> = ({errors, validators, clearError, user, setUserData}) => {
    const {currentUser} = useGlobalData();

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.name}
                hint={errors?.name || 'Use real name so people can recognize you'}
                title="Full name"
                value={user.name}
                onBlur={(e) => {
                    validators.name({name: e.target.value});
                }}
                onChange={(e) => {
                    setUserData({...user, name: e.target.value});
                }}
                onKeyDown={() => clearError('name')}
            />
            <TextField
                error={!!errors?.email}
                hint={errors?.email || 'Used for notifications'}
                title="Email"
                value={user.email}
                onBlur={(e) => {
                    validators.email({email: e.target.value});
                }}
                onChange={(e) => {
                    setUserData({...user, email: e.target.value});
                }}
                onKeyDown={() => clearError('email')}
            />
            <TextField
                hint="https://example.com/author"
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
