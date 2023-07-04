import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useRoles from '../../../hooks/useRoles';
import useRouting from '../../../hooks/useRouting';
import useStaffUsers from '../../../hooks/useStaffUsers';
import validator from 'validator';
import {ServicesContext} from '../../providers/ServiceProvider';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useContext, useEffect, useRef, useState} from 'react';

type RoleType = 'administrator' | 'editor' | 'author' | 'contributor';

const InviteUserModal = NiceModal.create(() => {
    const {api} = useContext(ServicesContext);
    const {roles, assignableRoles, getRoleId} = useRoles();
    const {invites, setInvites} = useStaffUsers();
    const {updateRoute} = useRouting();

    const focusRef = useRef<HTMLInputElement>(null);
    const [email, setEmail] = useState<string>('');
    const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | ''>('');
    const [role, setRole] = useState<RoleType>('contributor');
    const [errors, setErrors] = useState<{
        email?: string;
    }>({});

    useEffect(() => {
        if (focusRef.current) {
            focusRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
            }, 2000);
        }
    }, [saveState]);

    let okLabel = 'Send invitation now';
    if (saveState === 'saving') {
        okLabel = 'Sending...';
    } else if (saveState === 'saved') {
        okLabel = 'Invite sent!';
    } else if (saveState === 'error') {
        okLabel = 'Retry';
    }

    const handleSendInvitation = async () => {
        if (saveState === 'saving') {
            return;
        }

        if (!validator.isEmail(email)) {
            setErrors({
                email: 'Please enter a valid email address.'
            });
            return;
        }
        setSaveState('saving');
        try {
            const res = await api.invites.add({
                email,
                roleId: getRoleId(role, roles)
            });

            // Update invites list
            setInvites([...invites, res.invites[0]]);

            setSaveState('saved');

            showToast({
                message: `Invitation successfully sent to ${email}`,
                type: 'success'
            });
        } catch (e: any) {
            setSaveState('error');

            showToast({
                message: `Failed to send invitation to ${email}`,
                type: 'error'
            });
            return;
        }
    };

    const roleOptions = [
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
    ];

    const allowedRoleOptions = roleOptions.filter((option) => {
        return assignableRoles.some((r) => {
            return r.name === option.label;
        });
    });

    return (
        <Modal
            afterClose={() => {
                updateRoute('users');
            }}
            cancelLabel=''
            okLabel={okLabel}
            size={540}
            testId='invite-user-modal'
            title='Invite a new staff user'
            onOk={handleSendInvitation}
        >
            <div className='flex flex-col gap-6 py-4'>
                <p>
                    Send an invitation for a new person to create a staff account on your site, and select a role that matches what you’d like them to be able to do.
                </p>
                <TextField
                    clearBg={true}
                    error={!!errors.email}
                    hint={errors.email}
                    inputRef={focusRef}
                    placeholder='jamie@example.com'
                    title='Email address'
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                    }}
                />
                <div>
                    <Radio
                        id='role'
                        options={allowedRoleOptions}
                        selectedOption={role}
                        separator={true}
                        title="Role"
                        onSelect={(value) => {
                            setRole(value as RoleType);
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
});

export default InviteUserModal;
