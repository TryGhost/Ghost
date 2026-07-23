import ChangePasswordForm from './change-password-form';
import RoleSelector from './role-selector';
import StaffToken from './staff-token';
import {Field, FieldDescription, FieldError, FieldLabel, Textarea} from '@tryghost/shade/components';
import {SettingGroup, SettingGroupContent} from '@tryghost/shade/patterns';
import {TextField} from '@tryghost/admin-x-design-system';
import {type UserDetailProps} from '../user-detail-modal';
import {formatNumber} from '@tryghost/shade/utils';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useGlobalData} from '../../../providers/global-data-provider';

const BasicInputs: React.FC<UserDetailProps> = ({errors, clearError, user, setUserData}) => {
    const {currentUser, siteData} = useGlobalData();
    const homepageUrl = getHomepageUrl(siteData!);

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
                hint={`${homepageUrl}author/${user.slug}`}
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
            <Field data-invalid={Boolean(errors?.bio) || undefined}>
                <FieldLabel htmlFor='staff-bio'>Bio</FieldLabel>
                <Textarea
                    aria-invalid={Boolean(errors?.bio) || undefined}
                    className='border-transparent bg-muted'
                    id='staff-bio'
                    maxLength={65535}
                    value={user.bio || ''}
                    onChange={(e) => {
                        setUserData({...user, bio: e.target.value});
                    }}
                    onKeyDown={() => clearError('bio')}
                />
                {errors?.bio ? <FieldError>{errors.bio}</FieldError> : <FieldDescription>Recommended: {formatNumber(250)} characters. You&lsquo;ve used <span className='font-bold'>{formatNumber(user.bio?.length || 0)}</span></FieldDescription>}
            </Field>
            {user.id === currentUser.id && <StaffToken />}
        </SettingGroupContent>
    );
};

const ProfileTab: React.FC<UserDetailProps> = (props) => {
    return (
        <SettingGroup variant='plain'>
            <BasicInputs {...props} />
        </SettingGroup>
    );
};

export default ProfileTab;
