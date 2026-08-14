import NiceModal from '@ebay/nice-modal-react';
import validator from 'validator';
import {APIError, ValidationError} from '@tryghost/admin-x-framework/errors';
import {Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSeparator, FieldSet, Input, RadioGroup, RadioGroupItem} from '@tryghost/shade/components';
import {HostLimitError, useLimiter} from '../../../hooks/use-limiter';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useAddInvite, useBrowseInvites} from '@tryghost/admin-x-framework/api/invites';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RoleType = 'administrator' | 'editor' | 'author' | 'contributor' | 'super editor';

const USER_ALREADY_REGISTERED_CODE = 'USER_ALREADY_REGISTERED';
const USER_ALREADY_EXISTS_ERROR = 'A user with that email address already exists.';

const InviteUserModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const rolesQuery = useBrowseRoles();
    const assignableRolesQuery = useBrowseRoles({
        searchParams: {limit: '100', permissions: 'assign'}
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
                email: USER_ALREADY_EXISTS_ERROR
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

            toast.success(`Invitation sent`, {description: `${email}`});

            modal.remove();
            updateRoute('staff?tab=invited');
        } catch (e) {
            const validationError = e instanceof ValidationError ? e.data?.errors[0] : undefined;

            if (validationError?.code === USER_ALREADY_REGISTERED_CODE) {
                setSaveState('');
                setErrors({
                    email: USER_ALREADY_EXISTS_ERROR
                });
                return;
            }

            setSaveState('error');
            const title = 'Failed to send invitation';
            let message = (<span>If the problem persists, <a href="https://ghost.org/contact"><u>contact support</u>.</a>.</span>);
            if (e instanceof APIError) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = e.data as any; // we have unknown data types in the APIError/error classes
                if (data?.errors?.[0]?.type === 'EmailError') {
                    message = (<span>Check your Mailgun configuration.</span>);
                }
            }
            toast.error(title, {description: message});
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

    if (errors.email) {
        okLabel = 'Retry';
    }

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('staff');
            }}
            cancelLabel=''
            okLabel={okLabel}
            okVariant={saveState === 'error' || !!errors.email ? 'destructive' : 'default'}
            testId='invite-user-modal'
            title='Invite a new staff user'
            width={540}
            onOk={handleSendInvitation}
        >
            <div className='flex flex-col gap-6 py-4 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <p>
                    Send an invitation for a new person to create a staff account on your site, and select a role that matches what you’d like them to be able to do.
                </p>
                <Field data-invalid={Boolean(errors.email) || undefined}>
                    <FieldLabel htmlFor='invite-email'>Email address</FieldLabel>
                    <Input
                        ref={focusRef}
                        aria-invalid={Boolean(errors.email) || undefined}
                        id='invite-email'
                        placeholder='jamie@example.com'
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        onKeyDown={() => setErrors(e => ({...e, email: undefined}))}
                    />
                    {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>
                <FieldSet>
                    <FieldLegend id='invite-role-legend' variant='label'>Role</FieldLegend>
                    <RadioGroup
                        aria-describedby={errors.role ? 'invite-role-error' : undefined}
                        aria-invalid={!!errors.role || undefined}
                        aria-labelledby='invite-role-legend'
                        name='role'
                        value={role}
                        onValueChange={value => setRole(value as RoleType)}
                    >
                        {allowedRoleOptions.map((option) => {
                            const id = `invite-role-${option.value.replace(/\s+/g, '-')}`;
                            return (
                                <Field key={option.value} className='has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0' orientation='horizontal'>
                                    <RadioGroupItem id={id} value={option.value} />
                                    <FieldContent>
                                        <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                                        <FieldDescription>{option.hint}</FieldDescription>
                                    </FieldContent>
                                </Field>
                            );
                        })}
                    </RadioGroup>
                    <FieldError id='invite-role-error'>{errors.role}</FieldError>
                    <FieldSeparator />
                </FieldSet>
            </div>
        </SettingsModal>
    );
});

export default InviteUserModal;
