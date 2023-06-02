import Button from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/ConfirmationModal';
import Heading from '../../../../admin-x-ds/global/Heading';
import Icon from '../../../../admin-x-ds/global/Icon';
import ImageUpload from '../../../../admin-x-ds/global/ImageUpload';
import Menu from '../../../../admin-x-ds/global/Menu';
import Modal from '../../../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../../admin-x-ds/global/Radio';
import React, {useContext, useEffect, useRef, useState} from 'react';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import Toggle from '../../../../admin-x-ds/global/Toggle';
import useRoles from '../../../../hooks/useRoles';
import {ServicesContext} from '../../../providers/ServiceProvider';
import {User} from '../../../../types/api';
import {isOwnerUser} from '../../../../utils/helpers';

interface CustomHeadingProps {
    children?: React.ReactNode;
}

interface UserDetailProps {
    user: User;
    setUserData?: (user: User) => void;
}

const CustomHeader: React.FC<CustomHeadingProps> = ({children}) => {
    return (
        <Heading level={4} separator={true}>{children}</Heading>
    );
};

const RoleSelector: React.FC<UserDetailProps> = ({user, setUserData}) => {
    const {roles} = useRoles();
    if (isOwnerUser(user)) {
        return (
            <>
                <Heading level={6}>Role</Heading>
                <div className='flex h-[295px] flex-col items-center justify-center gap-3 bg-grey-75 px-10 py-20 text-center text-sm text-grey-800'>
                    <Icon color='grey-800' name='crown' size='lg' />
                    This user is the owner of the site. To change their role, you need to transfer the ownership first.
                </div>
            </>
        );
    }

    return (
        <Radio
            defaultSelectedOption={user.roles[0].name.toLowerCase()}
            id='role'
            options={[
                {
                    hint: 'Can create and edit their own posts, but cannot publish. An Editor needs to approve and publish for them.',
                    label: 'Contributor',
                    value: 'contributor'
                },
                {
                    hint: 'A trusted user who can create, edit and publish their own posts, but can’t modify others.',
                    label: 'Author',
                    value: 'author'
                },
                {
                    hint: 'Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site.',
                    label: 'Editor',
                    value: 'editor'
                },
                {
                    hint: 'Trusted staff user who should be able to manage all content and users, as well as site settings and options.',
                    label: 'Administrator',
                    value: 'administrator'
                }
            ]}
            title="Role"
            onSelect={(value) => {
                const role = roles?.find(r => r.name.toLowerCase() === value.toLowerCase());
                if (role) {
                    setUserData?.({...user, roles: [role]});
                }
            }}
        />
    );
};
const BasicInputs: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroupContent>
            <TextField
                hint="Use real name so people can recognize you"
                title="Full name"
                value={user.name}
                onChange={(e) => {
                    setUserData?.({...user, name: e.target.value});
                }}
            />
            <TextField
                title="Email"
                value={user.email}
                onChange={(e) => {
                    setUserData?.({...user, email: e.target.value});
                }}
            />
            <RoleSelector setUserData={setUserData} user={user} />
        </SettingGroupContent>
    );
};

const Basic: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Basic info</CustomHeader>}
            title='Basic'
        >
            <BasicInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

const DetailsInputs: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroupContent>
            <TextField
                hint="https://example.com/author"
                title="Slug"
                value={user.slug}
                onChange={(e) => {
                    setUserData?.({...user, slug: e.target.value});
                }}
            />
            <TextField
                title="Location"
                value={user.location}
                onChange={(e) => {
                    setUserData?.({...user, location: e.target.value});
                }}
            />
            <TextField
                title="Website"
                value={user.website}
                onChange={(e) => {
                    setUserData?.({...user, website: e.target.value});
                }}
            />
            <TextField
                title="Facebook profile"
                value={user.facebook}
                onChange={(e) => {
                    setUserData?.({...user, facebook: e.target.value});
                }}
            />
            <TextField
                title="Twitter profile"
                value={user.twitter}
                onChange={(e) => {
                    setUserData?.({...user, twitter: e.target.value});
                }}
            />
            <TextField
                hint="Recommended: 200 characters."
                title="Bio"
                value={user.bio}
                onChange={(e) => {
                    setUserData?.({...user, bio: e.target.value});
                }}
            />
        </SettingGroupContent>
    );
};

const Details: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Details</CustomHeader>}
            title='Details'
        >
            <DetailsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

const EmailNotificationsInputs: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroupContent>
            <Toggle
                checked={user.comment_notifications}
                direction='rtl'
                hint='Every time a member comments on one of your posts'
                id='comments'
                label='Comments'
                onChange={(e) => {
                    setUserData?.({...user, comment_notifications: e.target.checked});
                }}
            />
            <Toggle
                checked={user.free_member_signup_notification}
                direction='rtl'
                hint='Every time a new free member signs up'
                id='new-signups'
                label='New signups'
                onChange={(e) => {
                    setUserData?.({...user, free_member_signup_notification: e.target.checked});
                }}
            />
            <Toggle
                checked={user.paid_subscription_started_notification}
                direction='rtl'
                hint='Every time a member starts a new paid subscription'
                id='new-paid-members'
                label='New paid members'
                onChange={(e) => {
                    setUserData?.({...user, paid_subscription_started_notification: e.target.checked});
                }}
            />
            <Toggle
                checked={user.paid_subscription_canceled_notification}
                direction='rtl'
                hint='Every time a member cancels their paid subscription'
                id='paid-member-cancellations'
                label='Paid member cancellations'
                onChange={(e) => {
                    setUserData?.({...user, paid_subscription_canceled_notification: e.target.checked});
                }}
            />
            <Toggle
                checked={user.milestone_notifications}
                direction='rtl'
                hint='Occasional summaries of your audience & revenue growth'
                id='milestones'
                label='Milestones'
                onChange={(e) => {
                    setUserData?.({...user, milestone_notifications: e.target.checked});
                }}
            />
        </SettingGroupContent>
    );
};

const EmailNotifications: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Email notifications</CustomHeader>}
            title='Email notifications'

        >
            <EmailNotificationsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

function passwordValidation({password, confirmPassword}: {password: string; confirmPassword: string}) {
    const errors: {
        newPassword?: string;
        confirmNewPassword?: string;
    } = {};
    if (password !== confirmPassword) {
        errors.newPassword = 'Your new passwords do not match';
        errors.confirmNewPassword = 'Your new passwords do not match';
    }
    if (password.length < 10) {
        errors.newPassword = 'Password must be at least 10 characters';
    }

    //ToDo: add more validations

    return errors;
}

const Password: React.FC<UserDetailProps> = ({user}) => {
    const [editPassword, setEditPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [saveState, setSaveState] = useState<'saving'|'saved'|'error'|''>('');
    const [errors, setErrors] = useState<{
        newPassword?: string;
        confirmNewPassword?: string;
    }>({});
    const newPasswordRef = useRef<HTMLInputElement>(null);
    const confirmNewPasswordRef = useRef<HTMLInputElement>(null);
    const {api} = useContext(ServicesContext);

    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
                setEditPassword(false);
            }, 2500);
        }
    }, [saveState]);

    const showPasswordInputs = () => {
        setEditPassword(true);
    };

    const view = (
        <Button
            color='grey'
            label='Change password'
            onClick={showPasswordInputs}
        />
    );
    let buttonLabel = 'Change password';
    if (saveState === 'saving') {
        buttonLabel = 'Updating...';
    } else if (saveState === 'saved') {
        buttonLabel = 'Updated';
    } else if (saveState === 'error') {
        buttonLabel = 'Retry';
    }
    const form = (
        <>
            <TextField
                error={!!errors.newPassword}
                hint={errors.newPassword}
                inputRef={newPasswordRef}
                title="New password"
                type="password"
                value=''
                onChange={(e) => {
                    setNewPassword(e.target.value);
                }}
            />
            <TextField
                error={!!errors.confirmNewPassword}
                hint={errors.confirmNewPassword}
                inputRef={confirmNewPasswordRef}
                title="Verify password"
                type="password"
                value=''
                onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                }}
            />
            <Button
                color='red'
                label={buttonLabel}
                onClick={async () => {
                    setSaveState('saving');
                    const validationErrros = passwordValidation({password: newPassword, confirmPassword: confirmNewPassword});
                    setErrors(validationErrros);
                    if (Object.keys(validationErrros).length > 0) {
                        // show errors
                        setNewPassword('');
                        setConfirmNewPassword('');
                        if (newPasswordRef.current) {
                            newPasswordRef.current.value = '';
                        }
                        if (confirmNewPasswordRef.current) {
                            confirmNewPasswordRef.current.value = '';
                        }
                        setSaveState('');
                        return;
                    }
                    try {
                        await api.users.updatePassword({
                            newPassword,
                            confirmNewPassword,
                            oldPassword: '',
                            userId: user?.id
                        });
                        setSaveState('saved');
                    } catch (e) {
                        setSaveState('error');
                        // show errors
                    }
                }}
            />
        </>
    );

    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Password</CustomHeader>}
            title='Password'

        >
            {editPassword ? form : view}
        </SettingGroup>
    );
};

interface UserDetailModalProps {
    user: User;
    updateUser?: (user: User) => void;
}

const UserMenuTrigger = () => (
    <div className='flex h-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] px-3 opacity-80 hover:opacity-100'>
        <Icon color='white' name='menu-horizontal' size='sm' />
    </div>
);

const confirmMakeOwner = () => {
    NiceModal.show(ConfirmationModal, {
        title: 'Transfer Ownership',
        prompt: 'Are you sure you want to transfer the ownership of this blog? You will not be able to undo this action.',
        okLabel: 'Yep — I\'m sure',
        okColor: 'red'
    });
};

const confirmDelete = () => {
    NiceModal.show(ConfirmationModal, {
        title: 'Are you sure you want to delete this user?',
        prompt: (
            <>
                <p className='mb-3'>The [user] will be permanently deleted and all their posts will be automatically assigned to the [site owner name].</p>
                <p>To make these easy to find in the future, each post will be given an internal tag of [new internal tag with username]</p>
            </>
        ),
        okLabel: 'Delete user',
        okColor: 'red'
    });
};

const confirmSuspend = () => {
    NiceModal.show(ConfirmationModal, {
        title: 'Are you sure you want to suspend this user?',
        prompt: (
            <>
                <strong>WARNING:</strong> This user will no longer be able to log in but their posts will be kept.
            </>
        ),
        okLabel: 'Suspend',
        okColor: 'red'
    });
};

const UserDetailModal:React.FC<UserDetailModalProps> = ({user, updateUser}) => {
    const [userData, setUserData] = useState(user);
    const [saveState, setSaveState] = useState('');

    const menuItems = [
        {
            id: 'make-owner',
            label: 'Make owner',
            onClick: confirmMakeOwner
        },
        {
            id: 'delete-user',
            label: 'Delete user',
            onClick: confirmDelete
        },
        {
            id: 'suspend-user',
            label: 'Suspend user',
            onClick: confirmSuspend
        },
        {
            id: 'view-user-activity',
            label: 'View user activity'
        }
    ];

    let okLabel = saveState === 'saved' ? 'Saved' : 'Save';
    if (saveState === 'saving') {
        okLabel = 'Saving...';
    }

    // remove saved state after 2 seconds
    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
            }, 2000);
        }
    }, [saveState]);

    const fileUploadButtonClasses = 'absolute right-[104px] bottom-12 bg-[rgba(0,0,0,0.75)] rounded text-sm text-white flex items-center justify-center px-3 h-8 opacity-80 hover:opacity-100 transition cursor-pointer font-medium z-10';

    return (
        <Modal
            okColor='green'
            okLabel={okLabel}
            size='lg'
            onOk={async () => {
                setSaveState('saving');
                await updateUser?.(userData);
                setSaveState('saved');
            }}
        >
            <div>
                <div className={`relative -mx-12 -mt-12 bg-gradient-to-tr from-grey-900 to-black`}>
                    <ImageUpload
                        deleteButtonClassName={fileUploadButtonClasses}
                        deleteButtonContent='Delete cover image'
                        fileUploadClassName={fileUploadButtonClasses}
                        height={userData.cover_image ? '100%' : '32px'}
                        id='cover-image'
                        imageClassName='absolute inset-0 bg-cover group'
                        imageURL={userData.cover_image || ''}
                        onDelete={() => {
                            alert('deleted');
                        }}
                        onUpload={() => {
                            alert('uploaded');
                        }}
                    >Upload cover image</ImageUpload>
                    <div className="absolute bottom-12 right-12">
                        <Menu items={menuItems} position='left' trigger={<UserMenuTrigger />}></Menu>
                    </div>
                    <div className='relative flex items-center gap-4 px-12 pb-12 pt-60'>

                        <ImageUpload
                            deleteButtonClassName='invisible absolute -right-2 -top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible'
                            fileUploadClassName='rounded-full bg-black flex items-center justify-center opacity-80 transition hover:opacity-100 -ml-2 cursor-pointer'
                            height='80px'
                            id='avatar'
                            imageClassName='relative rounded-full group bg-cover -ml-2'
                            imageURL={userData.profile_image}
                            width='80px'
                            onDelete={() => {
                                alert('deleted');
                            }}
                            onUpload={() => {
                                alert('uploaded');
                            }}
                        >
                            <Icon color='white' name='user-add' size='lg' />
                        </ImageUpload>
                        <div>
                            <Heading styles='text-white'>{user.name}</Heading>
                            <span className='text-md font-semibold text-white'>Administrator</span>
                        </div>
                    </div>
                </div>                
                <div className='mt-10 grid grid-cols-2 gap-x-12 gap-y-20 pb-10'>
                    <Basic setUserData={setUserData} user={userData} />
                    <Details setUserData={setUserData} user={userData} />
                    <EmailNotifications setUserData={setUserData} user={userData} />
                    <Password user={userData} />
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(UserDetailModal);
