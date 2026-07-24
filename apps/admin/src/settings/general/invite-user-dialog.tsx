import validator from "validator";
import { useEffect, useRef, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    RadioGroup,
    RadioGroupItem,
} from "@tryghost/shade/components";
import { APIError, ValidationError } from "@tryghost/admin-x-framework/errors";
import { useAddInvite, useBrowseInvites } from "@tryghost/admin-x-framework/api/invites";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseRoles } from "@tryghost/admin-x-framework/api/roles";
import { useBrowseUsers } from "@tryghost/admin-x-framework/api/users";
import { useNavigate } from "@tryghost/admin-x-framework";

import { TextField } from "@/settings/app/shared/text-field";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";

type RoleType = "administrator" | "editor" | "author" | "contributor" | "super editor";

const USER_ALREADY_REGISTERED_CODE = "USER_ALREADY_REGISTERED";
const USER_ALREADY_EXISTS_ERROR = "A user with that email address already exists.";

export function InviteUserDialog() {
    const navigate = useNavigate();
    const rolesQuery = useBrowseRoles();
    const assignableRolesQuery = useBrowseRoles({
        searchParams: { limit: "100", permissions: "assign" },
    });
    const limiter = useLimiter();

    const { data: configData } = useBrowseConfig();
    const editorBeta = Boolean(configData?.config.labs?.superEditors);
    const focusRef = useRef<HTMLInputElement>(null);
    const [email, setEmail] = useState("");
    const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | "">("");
    const [role, setRole] = useState<RoleType>("contributor");
    const [errors, setErrors] = useState<{ email?: string; role?: string }>({});

    const { data: { users } = {} } = useBrowseUsers();
    const { data: { invites } = {} } = useBrowseInvites();
    const { mutateAsync: addInvite } = useAddInvite();
    const handleError = useSettingsHandleError();

    useEffect(() => {
        focusRef.current?.focus();
    }, []);

    useEffect(() => {
        if (saveState === "saved") {
            const timer = setTimeout(() => {
                setSaveState("");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [saveState]);

    useEffect(() => {
        if (role !== "contributor" && limiter.isLimited("staff")) {
            limiter.errorIfWouldGoOverLimit("staff").then(() => {
                setErrors((e) => ({ ...e, role: undefined }));
            }).catch((error: unknown) => {
                if (error instanceof HostLimitError) {
                    setErrors((e) => ({ ...e, role: error.message }));
                    return;
                }
                throw error;
            });
        } else {
            setErrors((e) => ({ ...e, role: undefined }));
        }
    }, [limiter, role]);

    const handleClose = () => {
        navigate("/settings/staff");
    };

    if (!rolesQuery.data?.roles || !assignableRolesQuery.data?.roles) {
        return null;
    }

    const roles = rolesQuery.data.roles;
    const assignableRoles = assignableRolesQuery.data.roles;

    let okLabel = "Send invitation";
    if (saveState === "saving") {
        okLabel = "Sending...";
    } else if (saveState === "saved") {
        okLabel = "Invite sent!";
    } else if (saveState === "error" || errors.email) {
        okLabel = "Retry";
    }

    const handleSendInvitation = async () => {
        if (saveState === "saving") {
            return;
        }

        if (!validator.isEmail(email)) {
            setErrors({ email: "Please enter a valid email address." });
            return;
        }

        if (users?.some(({ email: userEmail }) => userEmail === email)) {
            setErrors({ email: USER_ALREADY_EXISTS_ERROR });
            return;
        }

        if (invites?.some(({ email: inviteEmail }) => inviteEmail === email)) {
            setErrors({ email: "A user with that email address was already invited." });
            return;
        }

        if (errors.role) {
            return;
        }

        setSaveState("saving");
        try {
            await addInvite({
                email,
                roleId: roles.find(({ name }) => name.toLowerCase() === role.toLowerCase())!.id,
            });

            setSaveState("saved");

            showToast({ title: "Invitation sent", message: email, type: "success" });

            navigate("/settings/staff?tab=invited");
        } catch (e) {
            const validationError = e instanceof ValidationError ? e.data?.errors[0] : undefined;

            if (validationError?.code === USER_ALREADY_REGISTERED_CODE) {
                setSaveState("");
                setErrors({ email: USER_ALREADY_EXISTS_ERROR });
                return;
            }

            setSaveState("error");
            let message: React.ReactNode = (<span>If the problem persists, <a className="underline" href="https://ghost.org/contact">contact support</a>.</span>);
            if (e instanceof APIError) {
                const data = e.data as { errors?: Array<{ type?: string }> } | undefined;
                if (data?.errors?.[0]?.type === "EmailError") {
                    message = <span>Check your Mailgun configuration.</span>;
                }
            }
            showToast({ title: "Failed to send invitation", message, type: "error" });
            handleError(e, { withToast: false });
        }
    };

    const roleOptions: Array<{ hint: string; label: string; value: RoleType }> = [
        {
            hint: "Can create and edit their own posts, but cannot publish. An Editor needs to approve and publish for them.",
            label: "Contributor",
            value: "contributor",
        },
        {
            hint: "A trusted user who can create, edit and publish their own posts, but can’t modify others.",
            label: "Author",
            value: "author",
        },
        {
            hint: "Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site.",
            label: "Editor",
            value: "editor",
        },
        {
            hint: "Trusted staff user who should be able to manage all content and users, as well as site settings and options.",
            label: "Administrator",
            value: "administrator",
        },
    ];

    // If the editor beta is enabled, replace the editor role option with the
    // super editor option — assignment-only, existing editors keep their role.
    if (editorBeta) {
        roleOptions[2] = {
            hint: "Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site. Can manage members and moderate comments.",
            label: "Editor (beta mode)",
            value: "super editor",
        };
    }
    const allowedRoleOptions = roleOptions.filter((option) => {
        return assignableRoles.some((r) => {
            return r.name === option.label || (r.name === "Super Editor" && option.label === "Editor (beta mode)");
        });
    });

    return (
        <Dialog open onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-h-[85vh] max-w-[540px] overflow-y-auto" data-testid="invite-user-modal">
                <DialogHeader>
                    <DialogTitle>Invite a new staff user</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <p>
                        Send an invitation for a new person to create a staff account on your site, and select a role that matches what you’d like them to be able to do.
                    </p>
                    <TextField
                        error={!!errors.email}
                        hint={errors.email}
                        inputRef={focusRef}
                        placeholder="jamie@example.com"
                        title="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onKeyDown={() => setErrors((e) => ({ ...e, email: undefined }))}
                    />
                    <FieldSet>
                        <FieldLegend id="invite-role-legend" variant="label">Role</FieldLegend>
                        <RadioGroup
                            aria-describedby={errors.role ? "invite-role-error" : undefined}
                            aria-invalid={!!errors.role || undefined}
                            aria-labelledby="invite-role-legend"
                            name="role"
                            value={role}
                            onValueChange={(value) => setRole(value as RoleType)}
                        >
                            {allowedRoleOptions.map((option) => {
                                const id = `invite-role-${option.value.replace(/\s+/g, "-")}`;
                                return (
                                    <Field key={option.value} className="has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0" orientation="horizontal">
                                        <RadioGroupItem id={id} value={option.value} />
                                        <FieldContent>
                                            <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                                            <FieldDescription>{option.hint}</FieldDescription>
                                        </FieldContent>
                                    </Field>
                                );
                            })}
                        </RadioGroup>
                        <FieldError id="invite-role-error">{errors.role}</FieldError>
                        <FieldSeparator />
                    </FieldSet>
                </div>
                <DialogFooter>
                    <Button
                        variant={saveState === "error" || errors.email ? "destructive" : "default"}
                        onClick={() => void handleSendInvitation()}
                    >
                        {okLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
