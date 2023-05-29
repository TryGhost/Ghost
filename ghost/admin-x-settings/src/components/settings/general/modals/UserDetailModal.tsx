import Avatar from '../../../../admin-x-ds/global/Avatar';
import Button from '../../../../admin-x-ds/global/Button';
import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../../admin-x-ds/global/Radio';
import React, {useState} from 'react';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../../admin-x-ds/global/TextField';
import Toggle from '../../../../admin-x-ds/global/Toggle';
import useRoles from '../../../../hooks/useRoles';
import {User} from '../../../../types/api';

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
const BasicInputs: React.FC<UserDetailProps> = ({user, setUserData}) => {
    const {roles} = useRoles();
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

const DetailsInputs: React.FC<UserDetailProps> = ({user}) => {
    return (
        <SettingGroupContent>
            <TextField
                hint="https://example.com/author"
                title="Slug"
                value={user.slug}
            />
            <TextField
                title="Location"
                value={user.location}
            />
            <TextField
                title="Website"
                value={user.website}
            />
            <TextField
                title="Facebook profile"
                value={user.facebook}
            />
            <TextField
                title="Twitter profile"
                value={user.twitter}
            />
            <TextField
                hint="Recommended: 200 characters."
                title="Bio"
                value={user.bio}
            />
        </SettingGroupContent>
    );
};

const Details: React.FC<UserDetailProps> = ({user}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Details</CustomHeader>}
            title='Details'
        >
            <DetailsInputs user={user} />
        </SettingGroup>
    );
};

const EmailNotificationsInputs: React.FC<UserDetailProps> = ({user}) => {
    return (
        <SettingGroupContent>
            <Toggle
                checked={user.comment_notifications}
                direction='rtl'
                hint='Every time a member comments on one of your posts'
                id='comments'
                label='Comments'
            />
            <Toggle
                checked={user.free_member_signup_notification}
                direction='rtl'
                hint='Every time a new free member signs up'
                id='new-signups'
                label='New signups'
            />
            <Toggle
                checked={user.paid_subscription_started_notification}
                direction='rtl'
                hint='Every time a member starts a new paid subscription'
                id='new-paid-members'
                label='New paid members'
            />
            <Toggle
                checked={user.paid_subscription_canceled_notification}
                direction='rtl'
                hint='Every time a member cancels their paid subscription'
                id='paid-member-cancellations'
                label='Paid member cancellations'
            />
            <Toggle
                checked={user.milestone_notifications}
                direction='rtl'
                hint='Occasional summaries of your audience & revenue growth'
                id='milestones'
                label='Milestones'
            />
        </SettingGroupContent>
    );
};

const EmailNotifications: React.FC<UserDetailProps> = ({user}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Email notifications</CustomHeader>}
            title='Email notifications'
        >
            <EmailNotificationsInputs user={user} />
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
    return (
        <Modal
            okColor='green'
            okLabel='Save'
            size='lg'
            onOk={() => {
                alert('Clicked OK');
                updateUser?.(userData);
            }}
        >
            <div>
                <div className='-mx-12 -mt-12 bg-gradient-to-tr from-grey-900 to-black p-12 text-white'>
                    <div className='mt-60'>
                        <Avatar bgColor='green' className='-ml-1 mb-2' label='DV' labelColor='white' size='xl' />
                        <Heading styles='text-white'>{user.name}</Heading>
                        <span className='text-md font-semibold'>Administrator</span>
                    </div>
                </div>
                <div className='mt-10 grid grid-cols-2 gap-x-12 gap-y-20 pb-10'>
                    <Basic setUserData={setUserData} user={userData} />
                    <Details user={userData} />
                    <EmailNotifications user={userData} />
                    <Password />
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(UserDetailModal);
