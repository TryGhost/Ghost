import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useHandleError from '../../../utils/api/handleError';
import useRouting from '../../../hooks/useRouting';
import validator from 'validator';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useAddInvite, useBrowseInvites} from '../../../api/invites';
import {useBrowseRoles} from '../../../api/roles';
import {useBrowseUsers} from '../../../api/users';
import {useEffect, useRef, useState} from 'react';

type RoleType = 'administrator' | 'editor' | 'author' | 'contributor';

const InviteUserModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const rolesQuery = useBrowseRoles();
    const assignableRolesQuery = useBrowseRoles({
        searchParams: {limit: 'all', permissions: 'assign'}
    });
    const limiter = useLimiter();

    const {updateRoute} = useRouting();

    const focusRef = useRef<HTMLInputElement>(null);
    const [email, setEmail] = useState<string>('');
    const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | ''>('');
    const [role, setRole] = useState<RoleType>('contributor');
    const [errors, setErrors] = useState<{
        email?: string;
        role?: string;
    }>({});

    const {data: {users} = {}} = useBrowseUsers();
    const {data: {invites} = {}} = useBrowseInvites();
    const {mutateAsync: addInvite} = useAddInvite();
    const handleError = useHandleError();

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

    useEffect(() => {
        if (role !== 'contributor' && limiter?.isLimited('staff')) {
            limiter.errorIfWouldGoOverLimit('staff').then(() => {
                setErrors(e => ({...e, role: undefined}));
            }).catch((error) => {
                if (error instanceof HostLimitError) {
                    setErrors(e => ({...e, role: error.message}));
                    return;
                } else {
                    throw error;
                }
            });
        } else {
            setErrors(e => ({...e, role: undefined}));
        }
    }, [limiter, role]);

    if (!rolesQuery.data?.roles || !assignableRolesQuery.data?.roles) {
        return null;
    }

    const roles = rolesQuery.data.roles;
    const assignableRoles = assignableRolesQuery.data.roles;

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

        if (users?.some(({email: userEmail}) => userEmail === email)) {
            setErrors({
                email: 'A user with that email address already exists.'
            });
            return;
        }

        if (invites?.some(({email: inviteEmail}) => inviteEmail === email)) {
            setErrors({
                email: 'A user with that email address was already invited.'
            });
            return;
        }

        if (errors.role) {
            return;
        }

        setSaveState('saving');
        try {
            await addInvite({
                email,
                roleId: roles.find(({name}) => name.toLowerCase() === role.toLowerCase())!.id
            });

            setSaveState('saved');

            showToast({
                message: `Invitation successfully sent to ${email}`,
                type: 'success'
            });

            modal.remove();
            updateRoute('staff');
        } catch (e) {
            setSaveState('error');

            showToast({
                message: `Failed to send invitation to ${email}`,
                type: 'error'
            });
            handleError(e, {withToast: false});
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
                updateRoute('staff');
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
                    error={!!errors.email}
                    hint={errors.email}
                    inputRef={focusRef}
                    placeholder='jamie@example.com'
                    title='Email address'
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                    }}
                    onKeyDown={() => setErrors(e => ({...e, email: undefined}))}
                />
                <div>
                    <Radio
                        error={!!errors.role}
                        hint={errors.role}
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
