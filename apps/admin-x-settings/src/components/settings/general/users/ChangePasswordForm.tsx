import {Button, TextField, showToast} from '@tryghost/admin-x-design-system';
import {User, useUpdatePassword} from '@tryghost/admin-x-framework/api/users';
import {ValidationError} from '@tryghost/admin-x-framework/errors';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
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
    let chars: Record<string, number> = {};
    let allowedOccurancy;
    let valid = true;

    allowedOccurancy = stringToTest.length / 2;

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
    for (let charCount in chars) {
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
        let blogUrlWithSlash;

        blogUrl = blogUrl.replace(/^http(s?):\/\//, '');
        blogUrlWithSlash = blogUrl.match(/\/$/) ? blogUrl : `${blogUrl}/`;

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
            {isCurrentUser && <TextField
                data-testid="old-password"
                error={!!errors.oldPassword}
                hint={errors.oldPassword}
                inputRef={oldPasswordRef}
                title="Old password"
                type="password"
                value={oldPassword}
                onChange={(e) => {
                    setOldPassword(e.target.value);
                }}
            />}
            <TextField
                data-testid="new-password"
                error={!!errors.newPassword}
                hint={errors.newPassword}
                inputRef={newPasswordRef}
                title="New password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                    setNewPassword(e.target.value);
                }}
            />
            <TextField
                data-testid="confirm-password"
                error={!!errors.confirmNewPassword}
                hint={errors.confirmNewPassword}
                inputRef={confirmNewPasswordRef}
                title="Confirm new password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                }}
            />
            <div className='mt-1 flex items-center justify-end gap-3'>
                <Button
                    color='outline'
                    label='Cancel'
                    onClick={() => {
                        setEditPassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setErrors({});
                    }}
                />
                <Button
                    color='green'
                    data-testid='save-password-button'
                    label={buttonLabel}
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
                            showToast({
                                type: 'error',
                                title: e instanceof ValidationError ? e.message : `Couldn't update password. Please try again.`
                            });
                            handleError(e, {withToast: false});
                        }
                    }}
                />
            </div>
        </>
    );

    const initialView = (
        <div className='relative flex flex-col'>
            <TextField containerClassName='grow' disabled={true} title='Password' type='password' value='••••••••••••' />
            <Button className='absolute right-0 top-0' color='green' data-testid='change-password-button' label='Change' link={true} onClick={showPasswordInputs} />
        </div>
    );

    return (
        <>
            {editPassword ? form : initialView}
        </>
    );
};

export default ChangePasswordForm;
