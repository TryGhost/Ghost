import ChangePasswordForm from './change-password-form';
import RoleSelector from './role-selector';
import StaffToken from './staff-token';
import {Field, FieldDescription, FieldError, FieldLabel, Input, Textarea} from '@tryghost/shade/components';
import {SettingGroup, SettingGroupContent} from '@tryghost/shade/patterns';
import {type UserDetailProps} from '../user-detail-modal';
import {formatNumber} from '@tryghost/shade/utils';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useGlobalData} from '../../../providers/global-data-provider';

const BasicInputs: React.FC<UserDetailProps> = ({errors, clearError, user, setUserData}) => {
    const {currentUser, siteData} = useGlobalData();
    const homepageUrl = getHomepageUrl(siteData!);

    return (
        <SettingGroupContent className='[&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
            <Field data-invalid={Boolean(errors?.email) || undefined}>
                <FieldLabel htmlFor='staff-email'>Email</FieldLabel>
                <Input aria-invalid={Boolean(errors?.email) || undefined} id='staff-email' maxLength={191} value={user.email} onChange={e => setUserData({...user, email: e.target.value})} onKeyDown={() => clearError('email')} />
                {errors?.email ? <FieldError>{errors.email}</FieldError> : <FieldDescription>Used for notifications</FieldDescription>}
            </Field>
            <ChangePasswordForm user={user} />
            {hasAdminAccess(currentUser) && <RoleSelector setUserData={setUserData} user={user} />}
            <Field data-invalid={Boolean(errors?.name) || undefined}>
                <FieldLabel htmlFor='staff-name'>Full name</FieldLabel>
                <Input aria-invalid={Boolean(errors?.name) || undefined} id='staff-name' maxLength={191} value={user.name} onChange={e => setUserData({...user, name: e.target.value})} onKeyDown={() => clearError('name')} />
                {errors?.name ? <FieldError>{errors.name}</FieldError> : <FieldDescription>Use your real name so people can recognize you</FieldDescription>}
            </Field>
            <Field>
                <FieldLabel htmlFor='staff-slug'>Slug</FieldLabel>
                <Input id='staff-slug' maxLength={191} value={user.slug} onChange={e => setUserData({...user, slug: e.target.value})} />
                <FieldDescription>{homepageUrl}author/{user.slug}</FieldDescription>
            </Field>
            <Field data-invalid={Boolean(errors?.location) || undefined}>
                <FieldLabel htmlFor='staff-location'>Location</FieldLabel>
                <Input aria-invalid={Boolean(errors?.location) || undefined} id='staff-location' maxLength={65535} value={user.location || ''} onChange={e => setUserData({...user, location: e.target.value})} onKeyDown={() => clearError('location')} />
                {errors?.location ? <FieldError>{errors.location}</FieldError> : <FieldDescription>Where in the world do you live?</FieldDescription>}
            </Field>
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
