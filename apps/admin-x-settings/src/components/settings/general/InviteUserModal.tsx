import NiceModal from '@ebay/nice-modal-react';
import validator from 'validator';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {Modal, Radio, TextField, showToast} from '@tryghost/admin-x-design-system';
import {useAddInvite, useBrowseInvites} from '@tryghost/admin-x-framework/api/invites';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RoleType = 'administrator' | 'editor' | 'author' | 'contributor' | 'super editor';

const InviteUserModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const rolesQuery = useBrowseRoles();
    const assignableRolesQuery = useBrowseRoles({
        searchParams: {limit: 'all', permissions: 'assign'}
    });
    const limiter = useLimiter();

    const {updateRoute} = useRouting();
    const {config} = useGlobalData();
    const editorBeta = config.labs.superEditors;
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

    let okLabel = 'Send invitation';
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
                title: `Invitation sent`,
                message: `${email}`,
                type: 'success'
            });

            modal.remove();
            updateRoute('staff?tab=invited');
        } catch (e) {
            setSaveState('error');
            let title = 'Failed to send invitation';
            let message = (<span>If the problem persists, <a href="https://ghost.org/contact"><u>contact support</u>.</a>.</span>);
            if (e instanceof APIError) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let data = e.data as any; // we have unknown data types in the APIError/error classes
                if (data?.errors?.[0]?.type === 'EmailError') {
                    message = (<span>Check your Mailgun configuration.</span>);
                }
            }
            showToast({
                title,
                message,
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
  
    // If the editor beta is enabled, replace the editor role option with super editor options.
    // This gets a little weird, because we aren't changing what is actually assigned based on the toggle.
    // So, a site could have the editor beta enabled, but that doesn't automatically convert their editors.
    // (Editors can be up/downgraded by reassigning them in this modal.  For 6.0, we should decide whether
    // the old editors are going away or whether both roles are staying, and tidy this up then.)

    if (editorBeta) {
        roleOptions[2] = {
            hint: 'Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site. Can manage members and moderate comments.',
            label: 'Editor (beta mode)',
            value: 'super editor'
        };
    };
    const allowedRoleOptions = roleOptions.filter((option) => {
        return assignableRoles.some((r) => {
            return r.name === option.label || (r.name === 'Super Editor' && option.label === 'Editor (beta mode)');
        });
    });

    if (!!errors.email) {
        okLabel = 'Retry';
    }

    return (
        <Modal
            afterClose={() => {
                updateRoute('staff');
            }}
            cancelLabel=''
            okColor={saveState === 'error' || !!errors.email ? 'red' : 'black'}
            okLabel={okLabel}
            testId='invite-user-modal'
            title='Invite a new staff user'
            width={540}
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
