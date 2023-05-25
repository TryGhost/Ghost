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

interface CustomHeadingProps {
    children?: string;
}

const CustomHeader: React.FC<CustomHeadingProps> = ({children}) => {
    return (
        <Heading level={4} separator={true}>{children}</Heading>
    );
};

const Basic: React.FC = () => {
    const inputs = (
        <SettingGroupContent>
            <TextField
                hint="Use real name so people can recognize you"
                title="Full name"
                value="Martin Culhane"
            />
            <TextField
                title="Email"
                value="martin@culhane.com"
            />
            <Radio
                defaultSelectedOption="administrator"
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
                onSelect={() => {}}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            border={false}
            customHeader={<CustomHeader>Basic info</CustomHeader>}
            title='Basic'
        >
            {inputs}
        </SettingGroup>
    );
};

const Details: React.FC = () => {
    const inputs = (
        <SettingGroupContent>
            <TextField
                hint="https://example.com/author"
                title="Slug"
            />
            <TextField
                title="Location"
            />
            <TextField
                title="Website"
            />
            <TextField
                title="Facebook profile"
            />
            <TextField
                title="Twitter profile"
            />
            <TextField
                hint="Recommended: 200 characters."
                title="Bio"
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            border={false}
            customHeader={<CustomHeader>Details</CustomHeader>}
            title='Details'
        >
            {inputs}
        </SettingGroup>
    );
};

const EmailNotifications: React.FC = () => {
    const inputs = (
        <SettingGroupContent>
            <Toggle
                direction='rtl'
                hint='Every time a member comments on one of your posts'
                id='comments'
                label='Comments'
            />
            <Toggle
                direction='rtl'
                hint='Every time a new free member signs up'
                id='new-signups'
                label='New signups'
            />
            <Toggle
                direction='rtl'
                hint='Every time a member starts a new paid subscription'
                id='new-paid-members'
                label='New paid members'
            />
            <Toggle
                direction='rtl'
                hint='Every time a member cancels their paid subscription'
                id='paid-member-cancellations'
                label='Paid member cancellations'
            />
            <Toggle
                direction='rtl'
                hint='Occasional summaries of your audience & revenue growth'
                id='milestones'
                label='Milestones'
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            border={false}
            customHeader={<CustomHeader>Email notifications</CustomHeader>}
            title='Email notifications'
        >
            {inputs}
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

const UserDetailModal = NiceModal.create(() => {
    return (
        <Modal 
            okColor='green'
            okLabel='Save'
            size='xl'
            onOk={() => {
                alert('Clicked OK'); 
            }}
        >
            <div>
                <div className='-mx-12 -mt-12 bg-gradient-to-tr from-grey-900 to-black p-12 text-white'>
                    <div className='mt-60'>
                        <Heading styles='text-white'>Martin Culhane</Heading>
                        <span className='text-md font-semibold'>Administrator</span>
                    </div>
                </div>
                <div className='mt-10 grid grid-cols-2 gap-x-12 gap-y-20 pb-10'>
                    <Basic />
                    <Details />
                    <EmailNotifications />
                    <Password />
                </div>
            </div>
        </Modal>
    );
});

export default UserDetailModal;