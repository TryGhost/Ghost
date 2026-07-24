import {Button, Field, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {type User, useUpdatePassword} from '@tryghost/admin-x-framework/api/users';
import {ValidationError} from '@tryghost/admin-x-framework/errors';
import {toast} from 'sonner';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const BAD_PASSWORDS = [
    '1234567890',
    'qwertyuiop',
    'qwertzuiop',
    'asdfghjkl;',
    'abcdefghij',
    '0987654321',
    '1q2w3e4r5t',
    '12345asdfg'
];
const DISALLOWED_PASSWORDS = ['ghost', 'password', 'passw0rd'];

/**
 * Counts repeated characters if a string. When 50% or more characters are the same,
 * we return false and therefore invalidate the string.
 */
const validateCharacterOccurrance = (stringToTest: string) => {
    const chars: Record<string, number> = {};
    let valid = true;

    const allowedOccurancy = stringToTest.length / 2;

    // Loop through string and accumulate character counts
    for (let i = 0; i < stringToTest.length; i += 1) {
        if (!chars[stringToTest[i]]) {
            chars[stringToTest[i]] = 1;
        } else {
            chars[stringToTest[i]] += 1;
        }
    }

    // check if any of the accumulated chars exceed the allowed occurancy
    // of 50% of the words' length.
    for (const charCount in chars) {
        if (chars[charCount] >= allowedOccurancy) {
            valid = false;
            return valid;
        }
    }

    return valid;
};

const ChangePasswordForm: React.FC<{user: User}> = ({user}) => {
    const {currentUser, config, siteData} = useGlobalData();
    const [editPassword, setEditPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [saveState, setSaveState] = useState<'saving'|'saved'|'error'|''>('');
    const [errors, setErrors] = useState<{
        oldPassword?: string;
        newPassword?: string;
        confirmNewPassword?: string;
    }>({});
    const newPasswordRef = useRef<HTMLInputElement>(null);
    const confirmNewPasswordRef = useRef<HTMLInputElement>(null);
    const oldPasswordRef = useRef<HTMLInputElement>(null);

    const {mutateAsync: updatePassword} = useUpdatePassword();
    const handleError = useHandleError();

    const isCurrentUser = user.id === currentUser.id;

    const validate = ({password, confirmPassword}: {password: string; confirmPassword: string}) => {
        if (isCurrentUser && !oldPassword) {
            return {oldPassword: 'Your current password is required to set a new one'};
        }

        if (password !== confirmPassword) {
            return {
                newPassword: 'Your new passwords do not match',
                confirmNewPassword: 'Your new passwords do not match'
            };
        }

        let blogUrl = config.blogUrl || window.location.host;
        let blogTitle = siteData.title;

        blogUrl = blogUrl.replace(/^http(s?):\/\//, '');
        const blogUrlWithSlash = blogUrl.match(/\/$/) ? blogUrl : `${blogUrl}/`;

        blogTitle = blogTitle ? blogTitle.trim().toLowerCase() : blogTitle;

        if (password.length < 10) {
            return {newPassword: 'Password must be at least 10 characters long.'};
        }

        password = password.toString();

        // disallow password from badPasswords list (e. g. '1234567890')
        for (const badPassword of BAD_PASSWORDS) {
            if (badPassword === password) {
                return {newPassword: 'Sorry, you cannot use an insecure password.'};
            }
        };

        // password must not match with users' email
        if (password.toLowerCase() === user.email.toLowerCase()) {
            return {newPassword: 'Sorry, you cannot use an insecure password.'};
        }

        // password must not contain the words 'ghost', 'password', or 'passw0rd'
        for (const disallowedPassword of DISALLOWED_PASSWORDS) {
            if (password.toLowerCase().indexOf(disallowedPassword) >= 0) {
                return {newPassword: 'Sorry, you cannot use an insecure password.'};
            }
        };

        // password must not match with blog title
        if (password.toLowerCase() === blogTitle) {
            return {newPassword: 'Sorry, you cannot use an insecure password.'};
        }

        // password must not match with blog URL (without protocol, with or without trailing slash)
        if (password.toLowerCase() === blogUrl || password.toLowerCase() === blogUrlWithSlash) {
            return {newPassword: 'Sorry, you cannot use an insecure password.'};
        }

        // disallow passwords where 50% or more of characters are the same
        if (!validateCharacterOccurrance(password)) {
            return {newPassword: 'Sorry, you cannot use an insecure password.'};
        }

        return {};
    };

    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
                setEditPassword(false);
            }, 2500);
        }
    }, [saveState]);

    useEffect(() => {
        if (editPassword) {
            setTimeout(() => {
                if (isCurrentUser) {
                    oldPasswordRef.current?.focus();
                } else {
                    newPasswordRef.current?.focus();
                }
            }, 100);
        }
    }, [editPassword, isCurrentUser]);

    const showPasswordInputs = () => {
        setEditPassword(true);
    };

    let buttonLabel = 'Save password';
    if (saveState === 'saving') {
        buttonLabel = 'Saving...';
    } else if (saveState === 'saved') {
        buttonLabel = 'Saved';
    }

    const form = (
        <>
            {isCurrentUser && <Field data-invalid={Boolean(errors.oldPassword) || undefined}>
                <FieldLabel htmlFor='old-password'>Old password</FieldLabel>
                <Input ref={oldPasswordRef} aria-invalid={Boolean(errors.oldPassword) || undefined} data-testid='old-password' id='old-password' type='password' value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                {errors.oldPassword && <FieldError>{errors.oldPassword}</FieldError>}
            </Field>}
            <Field data-invalid={Boolean(errors.newPassword) || undefined}>
                <FieldLabel htmlFor='new-password'>New password</FieldLabel>
                <Input ref={newPasswordRef} aria-invalid={Boolean(errors.newPassword) || undefined} data-testid='new-password' id='new-password' type='password' value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                {errors.newPassword && <FieldError>{errors.newPassword}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(errors.confirmNewPassword) || undefined}>
                <FieldLabel htmlFor='confirm-password'>Confirm new password</FieldLabel>
                <Input ref={confirmNewPasswordRef} aria-invalid={Boolean(errors.confirmNewPassword) || undefined} data-testid='confirm-password' id='confirm-password' type='password' value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                {errors.confirmNewPassword && <FieldError>{errors.confirmNewPassword}</FieldError>}
            </Field>
            <div className='mt-1 flex items-center justify-end gap-3'>
                <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                        setEditPassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setErrors({});
                    }}
                >Cancel</Button>
                <Button
                    data-testid='save-password-button'
                    type='button'
                    onClick={async () => {
                        setSaveState('saving');
                        const validationErrors = validate({password: newPassword, confirmPassword: confirmNewPassword});
                        setErrors(validationErrors);
                        if (Object.keys(validationErrors).length > 0) {
                            setSaveState('');
                            return;
                        }
                        try {
                            await updatePassword({
                                newPassword,
                                confirmNewPassword,
                                oldPassword,
                                userId: user?.id
                            });
                            setSaveState('saved');
                        } catch (e) {
                            setSaveState('');
                            toast.error(e instanceof ValidationError ? e.message : `Couldn't update password. Please try again.`);
                            handleError(e, {withToast: false});
                        }
                    }}
                >{buttonLabel}</Button>
            </div>
        </>
    );

    const initialView = (
        <div className='relative flex flex-col'>
            <Field className='grow' data-disabled={true}>
                <FieldLabel htmlFor='current-password'>Password</FieldLabel>
                <Input id='current-password' type='password' value='••••••••••••' disabled />
            </Field>
            <Button className='absolute top-0 right-0 h-auto p-0 hover:bg-transparent' data-testid='change-password-button' size='sm' type='button' variant='ghost' onClick={showPasswordInputs}>Change</Button>
        </div>
    );

    return (
        <>
            {editPassword ? form : initialView}
        </>
    );
};

export default ChangePasswordForm;
