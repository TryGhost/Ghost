import Avatar from '../../../../admin-x-ds/global/Avatar';
import Button from '../../../../admin-x-ds/global/Button';
import Heading from '../../../../admin-x-ds/global/Heading';
import IconButton from '../../../../admin-x-ds/global/IconButton';
import Menu from '../../../../admin-x-ds/global/Menu';
import Modal from '../../../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../../admin-x-ds/global/Radio';
import React, {useEffect, useState} from 'react';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import Toggle from '../../../../admin-x-ds/global/Toggle';
import useRoles from '../../../../hooks/useRoles';
import {User} from '../../../../types/api';
import {generateAvatarColor, getInitials, isOwnerUser} from '../../../../utils/helpers';

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
                <div>
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

const Password: React.FC = () => {
    const [editPassword, setEditPassword] = useState(false);

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

    const form = (
        <>
            <TextField
                title="New password"
                type="password"
                value=''
            />
            <TextField
                title="Verify password"
                type="password"
                value=''
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

const UserDetailModal:React.FC<UserDetailModalProps> = ({user, updateUser}) => {
    const [userData, setUserData] = useState(user);
    const [saveState, setSaveState] = useState('');

    const items = [
        {
            id: 'view-user-activity',
            label: 'View user activity'
        },
        {
            id: 'suspend-user',
            label: 'Suspend user'
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
                <div className={`relative -mx-12 -mt-12 bg-gradient-to-tr from-grey-900 to-black p-12`} style={userData.cover_image ? {backgroundImage: `url(${userData.cover_image})`, backgroundSize: 'cover'} : {}}>
                    {userData.cover_image && (
                        <div className='absolute inset-0 z-0 block bg-gradient-to-tr from-[rgba(0,0,0,0.5)] to-[rgba(0,0,0,0.01)]'></div>
                    )}
                    <div className="absolute right-8 top-8">
                        <Menu items={items} position='left' trigger={<IconButton iconName='menu-horizontal'></IconButton>}></Menu>
                    </div>
                    <div className='relative z-10 mt-60 flex gap-4'>
                        <Avatar bgColor={generateAvatarColor((userData.name ? userData.name : userData.email))} className='-ml-1' image={userData.profile_image} label={getInitials(userData.name)} labelColor='white' size='xl' />
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
                    <Password />
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(UserDetailModal);
