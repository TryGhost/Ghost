import { useEffect, useRef, useState } from "react";
import { Button } from "@tryghost/shade/components";
import { type User, useUpdatePassword } from "@tryghost/admin-x-framework/api/users";
import { ValidationError } from "@tryghost/admin-x-framework/errors";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";

import { TextField } from "@/settings/app/shared/text-field";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

const BAD_PASSWORDS = [
    "1234567890",
    "qwertyuiop",
    "qwertzuiop",
    "asdfghjkl;",
    "abcdefghij",
    "0987654321",
    "1q2w3e4r5t",
    "12345asdfg",
];
const DISALLOWED_PASSWORDS = ["ghost", "password", "passw0rd"];

/**
 * Counts repeated characters in a string. When 50% or more characters are the
 * same, the password is invalid.
 */
function validateCharacterOccurrance(stringToTest: string): boolean {
    const chars: Record<string, number> = {};
    const allowedOccurancy = stringToTest.length / 2;

    for (const char of stringToTest) {
        chars[char] = (chars[char] || 0) + 1;
    }

    return !Object.values(chars).some((count) => count >= allowedOccurancy);
}

export function ChangePasswordForm({ user }: { user: User }) {
    const { data: currentUser } = useCurrentUser();
    const { data: configData } = useBrowseConfig();
    const { data: siteResponse } = useBrowseSite();
    const [editPassword, setEditPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | "">("");
    const [errors, setErrors] = useState<{
        oldPassword?: string;
        newPassword?: string;
        confirmNewPassword?: string;
    }>({});
    const newPasswordRef = useRef<HTMLInputElement>(null);
    const oldPasswordRef = useRef<HTMLInputElement>(null);

    const { mutateAsync: updatePassword } = useUpdatePassword();
    const handleError = useSettingsHandleError();

    const isCurrentUser = user.id === currentUser?.id;

    const validate = ({ password, confirmPassword }: { password: string; confirmPassword: string }) => {
        if (isCurrentUser && !oldPassword) {
            return { oldPassword: "Your current password is required to set a new one" };
        }

        if (password !== confirmPassword) {
            return {
                newPassword: "Your new passwords do not match",
                confirmNewPassword: "Your new passwords do not match",
            };
        }

        let blogUrl = configData?.config.blogUrl || window.location.host;
        let blogTitle = siteResponse?.site.title;

        blogUrl = blogUrl.replace(/^http(s?):\/\//, "");
        const blogUrlWithSlash = blogUrl.match(/\/$/) ? blogUrl : `${blogUrl}/`;

        blogTitle = blogTitle ? blogTitle.trim().toLowerCase() : blogTitle;

        if (password.length < 10) {
            return { newPassword: "Password must be at least 10 characters long." };
        }

        password = password.toString();

        // disallow password from badPasswords list (e. g. '1234567890')
        for (const badPassword of BAD_PASSWORDS) {
            if (badPassword === password) {
                return { newPassword: "Sorry, you cannot use an insecure password." };
            }
        }

        // password must not match with users' email
        if (password.toLowerCase() === user.email.toLowerCase()) {
            return { newPassword: "Sorry, you cannot use an insecure password." };
        }

        // password must not contain the words 'ghost', 'password', or 'passw0rd'
        for (const disallowedPassword of DISALLOWED_PASSWORDS) {
            if (password.toLowerCase().indexOf(disallowedPassword) >= 0) {
                return { newPassword: "Sorry, you cannot use an insecure password." };
            }
        }

        // password must not match with blog title
        if (password.toLowerCase() === blogTitle) {
            return { newPassword: "Sorry, you cannot use an insecure password." };
        }

        // password must not match with blog URL (without protocol, with or without trailing slash)
        if (password.toLowerCase() === blogUrl || password.toLowerCase() === blogUrlWithSlash) {
            return { newPassword: "Sorry, you cannot use an insecure password." };
        }

        // disallow passwords where 50% or more of characters are the same
        if (!validateCharacterOccurrance(password)) {
            return { newPassword: "Sorry, you cannot use an insecure password." };
        }

        return {};
    };

    useEffect(() => {
        if (saveState === "saved") {
            const timer = setTimeout(() => {
                setSaveState("");
                setEditPassword(false);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [saveState]);

    useEffect(() => {
        if (editPassword) {
            const timer = setTimeout(() => {
                if (isCurrentUser) {
                    oldPasswordRef.current?.focus();
                } else {
                    newPasswordRef.current?.focus();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [editPassword, isCurrentUser]);

    let buttonLabel = "Save password";
    if (saveState === "saving") {
        buttonLabel = "Saving...";
    } else if (saveState === "saved") {
        buttonLabel = "Saved";
    }

    if (!editPassword) {
        return (
            <div className="relative flex flex-col">
                <TextField disabled={true} title="Password" type="password" value="••••••••••••" />
                <Button
                    className="absolute top-0 right-0 h-auto px-0 text-primary"
                    data-testid="change-password-button"
                    size="sm"
                    variant="link"
                    onClick={() => setEditPassword(true)}
                >
                    Change
                </Button>
            </div>
        );
    }

    return (
        <>
            {isCurrentUser && (
                <TextField
                    error={!!errors.oldPassword}
                    hint={errors.oldPassword}
                    inputRef={oldPasswordRef}
                    testId="old-password"
                    title="Old password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                />
            )}
            <TextField
                error={!!errors.newPassword}
                hint={errors.newPassword}
                inputRef={newPasswordRef}
                testId="new-password"
                title="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
                error={!!errors.confirmNewPassword}
                hint={errors.confirmNewPassword}
                testId="confirm-password"
                title="Confirm new password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => {
                        setEditPassword(false);
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setErrors({});
                    }}
                >
                    Cancel
                </Button>
                <Button
                    data-testid="save-password-button"
                    onClick={() => void (async () => {
                        setSaveState("saving");
                        const validationErrors = validate({ password: newPassword, confirmPassword: confirmNewPassword });
                        setErrors(validationErrors);
                        if (Object.keys(validationErrors).length > 0) {
                            setSaveState("");
                            return;
                        }
                        try {
                            await updatePassword({
                                newPassword,
                                confirmNewPassword,
                                oldPassword,
                                userId: user?.id,
                            });
                            setSaveState("saved");
                        } catch (e) {
                            setSaveState("");
                            showToast({
                                type: "error",
                                title: e instanceof ValidationError ? e.message : `Couldn't update password. Please try again.`,
                            });
                            handleError(e, { withToast: false });
                        }
                    })()}
                >
                    {buttonLabel}
                </Button>
            </div>
        </>
    );
}
