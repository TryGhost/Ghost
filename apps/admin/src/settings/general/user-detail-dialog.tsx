import validator from "validator";
import { useEffect, useRef, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import {
    type User,
    canAccessSettings,
    hasAdminAccess,
    isAdminUser,
    isAuthorOrContributor,
    isEditorUser,
    isOwnerUser,
    useDeleteUser,
    useEditUser,
    useGetUserBySlug,
    useMakeOwner,
} from "@tryghost/admin-x-framework/api/users";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";
import { SOCIAL_PLATFORM_CONFIGS, SOCIAL_PLATFORM_KEYS, getSocialValidationError } from "@tryghost/admin-x-settings/src/utils/social-urls";

import { EmailNotificationsTab, ProfileTab, SocialLinksTab } from "./user-detail-tabs";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";
import { usePinturaEditor } from "@/settings/app/shared/use-pintura-editor";
import { useStaffUsers } from "@/settings/app/shared/use-staff-users";

const validators: Record<string, (u: Partial<User>) => string> = {
    name: ({ name }) => {
        if (!name) {
            return "Name is required";
        }
        if (name && name.length > 191) {
            return "Name is too long";
        }
        return "";
    },
    email: ({ email }) => {
        return validator.isEmail(email || "") ? "" : "Enter a valid email address";
    },
    url: ({ url }) => {
        // require_tld is automatically true in validator 8+, we set it false here for our default localhost setup
        const valid = !url || validator.isURL(url, { require_tld: false });
        return valid ? "" : "Enter a valid URL";
    },
    bio: ({ bio }) => {
        const valid = !bio || bio.length <= 250;
        return valid ? "" : "Bio is too long";
    },
    location: ({ location }) => {
        const valid = !location || location.length <= 150;
        return valid ? "" : "Location is too long";
    },
    website: ({ website }) => {
        const valid = !website || (validator.isURL(website) && website.length <= 2000);
        return valid ? "" : "Enter a valid URL";
    },
    ...Object.fromEntries(SOCIAL_PLATFORM_CONFIGS.map((config) => [
        config.key,
        (values: Partial<User>) => getSocialValidationError(config.key, values[config.key]),
    ])),
};

function getTabFromParam(tab: string | undefined): string {
    if (tab === "social-links" || tab === "email-notifications") {
        return tab;
    }
    return "profile";
}

function UserDetailContent({ user }: { user: User }) {
    const navigate = useNavigate();
    const { tab } = useParams();
    const { ownerUser } = useStaffUsers();
    const { data: currentUser } = useCurrentUser();
    const handleError = useSettingsHandleError();
    const { confirm, showLimit } = useConfirmation();
    const { formState, setFormState, saveState, handleSave, updateForm, errors, setErrors, clearError, okProps } = useForm({
        initialState: user,
        savingDelay: 500,
        savedDelay: 500,
        onValidate: (values) => {
            return Object.entries(validators).reduce<ErrorMessages>((newErrors, [key, validate]) => {
                // a stored social handle that predates a validation-rule
                // tightening must not block saving an unrelated field on this
                // modal — only re-validate a platform the user actually
                // changed from what was loaded
                const isUnchangedSocialField = (SOCIAL_PLATFORM_KEYS as readonly string[]).includes(key)
                    && values[key as keyof User] === user[key as keyof User];
                if (isUnchangedSocialField) {
                    return newErrors;
                }

                const error = validate(values);
                if (error) {
                    newErrors[key] = error;
                }
                return newErrors;
            }, {});
        },
        onSave: async (values) => {
            const response = await updateUser?.(values);
            const savedUser = response?.users?.[0];

            if (!savedUser) {
                return;
            }

            // Sync the form with the saved user — the server may have
            // modified submitted values, e.g. sanitizing the slug
            setFormState(() => savedUser);

            if (savedUser.slug !== user.slug) {
                // Keep the URL in sync with the new slug, replacing the
                // history entry so refresh and back button still work
                const currentTab = getTabFromParam(tab);
                const urlSegment = currentTab === "profile" ? "" : `/${currentTab}`;
                navigate(`/settings/staff/${savedUser.slug}${urlSegment}`, { replace: true });
            }
        },
        onSaveError: handleError,
    });
    const setUserData = (newData: User) => updateForm(() => newData);
    const validateField = <K extends keyof User>(key: K, value: User[K]) => {
        const error = validators[key as string]?.({ [key]: value });
        if (error) {
            setErrors({ ...errors, [key]: error });
            return false;
        }
        clearError(key);
        return true;
    };

    const { mutateAsync: uploadImage } = useUploadImage();
    const { mutateAsync: updateUser } = useEditUser();
    const { mutateAsync: deleteUser } = useDeleteUser();
    const { mutateAsync: makeOwner } = useMakeOwner();
    const limiter = useLimiter();

    const navigateOnClose = () => {
        if (currentUser && canAccessSettings(currentUser)) {
            navigate("/settings/staff");
        } else {
            // Contributors can't access settings; exit to the admin root
            navigate("/", { crossApp: true });
        }
    };

    const handleClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", navigateOnClose);
    };

    const confirmSuspend = async (_user: User) => {
        if (_user.status === "inactive" && _user.roles[0].name !== "Contributor") {
            try {
                await limiter.errorIfWouldGoOverLimit("staff");
            } catch (error) {
                if (error instanceof HostLimitError) {
                    showLimit({
                        prompt: error.message || `Your current plan doesn't support more users.`,
                        onOk: () => navigate("/pro", { crossApp: true }),
                    });
                    return;
                }
                throw error;
            }
        }

        let warningText = "This user will no longer be able to log in but their posts will be kept.";
        if (_user.status === "inactive") {
            warningText = "This user will be able to log in again and will have the same permissions they had previously.";
        }
        confirm({
            title: "Are you sure you want to suspend this user?",
            prompt: (
                <>
                    <strong>WARNING:</strong> {warningText}
                </>
            ),
            okLabel: _user.status === "inactive" ? "Un-suspend" : "Suspend",
            okRunningLabel: _user.status === "inactive" ? "Un-suspending..." : "Suspending...",
            destructive: true,
            onOk: async () => {
                const updatedUserData = {
                    ..._user,
                    status: _user.status === "inactive" ? "active" : "inactive",
                };
                try {
                    await updateUser(updatedUserData);
                    setFormState(() => updatedUserData);
                    showToast({
                        title: _user.status === "inactive" ? "User un-suspended" : "User suspended",
                        type: "success",
                    });
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const confirmDelete = (_user: User, { owner }: { owner: User | undefined }) => {
        confirm({
            title: "Are you sure you want to delete this user?",
            prompt: (
                <>
                    <p className="mb-3"><span className="font-bold">{_user.name || _user.email}</span> will be permanently deleted and all their posts will be automatically assigned to <span className="font-bold">{owner?.name}</span>.</p>
                    <p>To make these easy to find in the future, each post will be given an internal tag of <span className="font-bold">#{user.slug}</span></p>
                </>
            ),
            okLabel: "Delete user",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteUser(_user?.id);
                    navigateOnClose();
                    showToast({
                        title: "User deleted",
                        type: "success",
                    });
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const confirmMakeOwner = () => {
        confirm({
            title: "Transfer Ownership",
            prompt: "Are you sure you want to transfer the ownership of this blog? You will not be able to undo this action.",
            okLabel: "Yep — I'm sure",
            destructive: true,
            onOk: async () => {
                try {
                    await makeOwner(user.id);
                    showToast({
                        title: "Ownership transferred",
                        type: "success",
                    });
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const editor = usePinturaEditor();

    const handleImageUpload = async (image: "cover_image" | "profile_image", file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({ file }));
            updateForm((_user) => ({ ..._user, [image]: imageUrl }));
        } catch (e) {
            const error = e as APIError;
            if (error.response?.status === 415) {
                error.message = "Unsupported file type";
            }
            handleError(error);
        }
    };

    const handleImageDelete = (image: "cover_image" | "profile_image") => {
        updateForm((_user) => ({ ..._user, [image]: "" }));
    };

    const showMenu = (currentUser && hasAdminAccess(currentUser)) || (currentUser && isEditorUser(currentUser) && isAuthorOrContributor(user));
    const canMakeOwner = currentUser && isOwnerUser(currentUser) && isAdminUser(formState) && formState.status !== "inactive";
    const canSuspendUser = currentUser && formState.id !== currentUser.id && (
        (hasAdminAccess(currentUser) && !isOwnerUser(user)) ||
        (isEditorUser(currentUser) && isAuthorOrContributor(user))
    );
    const suspendUserLabel = formState.status === "inactive" ? "Un-suspend user" : "Suspend user";

    const suspendedText = formState.status === "inactive" ? " (Suspended)" : "";

    const coverButtonClasses = "flex h-8 cursor-pointer flex-nowrap items-center justify-center rounded bg-black/75 px-3 font-medium whitespace-nowrap text-white opacity-80 transition-all hover:opacity-100";
    const noCoverButtonClasses = "flex h-8 cursor-pointer flex-nowrap items-center justify-center rounded border border-border bg-transparent px-3 font-medium text-foreground transition-all";

    const [selectedTab, setSelectedTab] = useState(getTabFromParam(tab));

    useEffect(() => {
        setSelectedTab(getTabFromParam(tab));
    }, [tab]);

    const handleTabChange = (newTabId: string) => {
        const urlSegment = newTabId === "profile" ? "" : `/${newTabId}`;
        navigate(`/settings/staff/${user.slug}${urlSegment}`);
        setSelectedTab(newTabId);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && handleClose()}>
            <DialogContent aria-describedby={undefined} className="flex max-h-[85vh] w-full max-w-[600px] flex-col gap-0 overflow-hidden p-0" data-testid="user-detail-modal">
                <div className="grow overflow-y-auto">
                    <div className="relative rounded-t">
                        <div
                            className={cn("flex flex-wrap items-end justify-between gap-8 p-8", formState.cover_image && "bg-cover bg-center")}
                            style={{
                                backgroundImage: formState.cover_image ? `url(${formState.cover_image})` : "none",
                            }}
                        >
                            <div className="flex w-full flex-col gap-2">
                                <div className="flex flex-nowrap items-start justify-between gap-3">
                                    <div>
                                        <ImageUpload
                                            containerClassName="-ml-1 size-[80px] shrink-0 bg-cover bg-center"
                                            deleteButtonClassName="-top-2 -right-1 size-8 rounded-full"
                                            fileUploadClassName="-ml-2 flex size-[80px] cursor-pointer items-center justify-center rounded-full border-transparent bg-black text-white opacity-80 transition hover:opacity-100"
                                            id="avatar"
                                            imageClassName="size-full shrink-0 rounded-full object-cover"
                                            imageTestId="profile-image-preview"
                                            imageURL={formState.profile_image ?? undefined}
                                            inputTestId="profile-image-upload"
                                            onDelete={() => handleImageDelete("profile_image")}
                                            onEdit={editor.isEnabled && formState.profile_image ? () => editor.openEditor({
                                                image: formState.profile_image || "",
                                                handleSave: (file: File) => void handleImageUpload("profile_image", file),
                                            }) : undefined}
                                            editButtonAriaLabel="Edit profile image"
                                            editButtonClassName="-top-2 right-8 size-8 rounded-full"
                                            onUpload={(file) => void handleImageUpload("profile_image", file)}
                                        >
                                            <LucideIcon.UserRoundPlus className="size-6" />
                                        </ImageUpload>
                                    </div>
                                    <div className="flex flex-nowrap items-start gap-3">
                                        <ImageUpload
                                            containerClassName="justify-end"
                                            deleteButtonClassName={cn(coverButtonClasses, "visible! static size-auto md:visible!")}
                                            deleteButtonContent="Delete cover image"
                                            fileUploadClassName={cn(formState.cover_image ? coverButtonClasses : noCoverButtonClasses)}
                                            id="cover-image"
                                            imageClassName="hidden"
                                            imageTestId="cover-image-preview"
                                            imageURL={formState.cover_image || undefined}
                                            inputTestId="cover-image-upload"
                                            onDelete={() => handleImageDelete("cover_image")}
                                            onEdit={editor.isEnabled && formState.cover_image ? () => editor.openEditor({
                                                image: formState.cover_image || "",
                                                handleSave: (file: File) => void handleImageUpload("cover_image", file),
                                            }) : undefined}
                                            editButtonAriaLabel="Edit cover image"
                                            editButtonClassName={cn(coverButtonClasses, "visible! static size-auto md:visible!")}
                                            editButtonContent="Edit cover image"
                                            onUpload={(file) => void handleImageUpload("cover_image", file)}
                                        >
                                            Upload cover image
                                        </ImageUpload>
                                        {showMenu && <div className="z-10">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className={cn(
                                                            "flex h-8 cursor-pointer items-center justify-center rounded px-3",
                                                            formState.cover_image
                                                                ? "bg-black/75 text-white opacity-80 hover:opacity-100"
                                                                : "border border-border bg-transparent text-foreground",
                                                        )}
                                                        type="button"
                                                    >
                                                        <span className="sr-only">Actions</span>
                                                        <LucideIcon.Ellipsis className="size-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {canMakeOwner && (
                                                        <DropdownMenuItem onSelect={confirmMakeOwner}>
                                                            Make owner
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onSelect={() => {
                                                        navigate(`/settings/history/view/${formState.id}`);
                                                    }}>
                                                        View user activity
                                                    </DropdownMenuItem>
                                                    {canSuspendUser && (
                                                        <>
                                                            <DropdownMenuItem onSelect={() => {
                                                                void confirmSuspend(formState);
                                                            }}>
                                                                {suspendUserLabel}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onSelect={() => {
                                                                    confirmDelete(user, { owner: ownerUser });
                                                                }}
                                                            >
                                                                Delete user
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>}
                                    </div>
                                </div>
                                <div>
                                    <DialogTitle className={cn("text-2xl break-words md:break-normal", formState.cover_image ? "text-white" : "text-foreground")}>{user.name}{suspendedText}</DialogTitle>
                                    <span className={cn("text-md font-medium capitalize", formState.cover_image ? "text-white" : "text-foreground")}>{user.roles[0].name.toLowerCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col px-8 pb-8">
                        <Tabs value={selectedTab} variant="underline" onValueChange={handleTabChange}>
                            <TabsList>
                                <TabsTrigger title="Profile" value="profile">Profile</TabsTrigger>
                                <TabsTrigger title="Social Links" value="social-links">Social Links</TabsTrigger>
                                <TabsTrigger title="Email Notifications" value="email-notifications">Email Notifications</TabsTrigger>
                            </TabsList>
                            <TabsContent className="pt-6" value="profile"><ProfileTab clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} /></TabsContent>
                            <TabsContent className="pt-6" value="social-links"><SocialLinksTab clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} /></TabsContent>
                            <TabsContent className="pt-6" value="email-notifications"><EmailNotificationsTab setUserData={setUserData} user={formState} /></TabsContent>
                        </Tabs>
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-elevated-2 px-6 py-4">
                    <Button disabled={okProps.disabled} variant="outline" onClick={handleClose}>Close</Button>
                    <Button
                        disabled={okProps.disabled}
                        variant={okProps.color === "red" ? "destructive" : "default"}
                        onClick={() => void handleSave({ fakeWhenUnchanged: true })}
                    >
                        {okProps.label || "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function UserDetailDialog() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();
    const handleError = useSettingsHandleError();

    // Skip the API call if it's the current user (we already have their data)
    const isCurrentUser = currentUser?.slug === slug;

    const { data: fetchedUserData, error } = useGetUserBySlug(
        slug || "",
        { enabled: !isCurrentUser && !!slug, defaultErrorHandler: false },
    );

    const user = isCurrentUser ? currentUser : fetchedUserData?.users?.[0];

    // Only a 404 (or an empty response) means the user doesn't exist — other
    // errors (server/network issues) get the default error handling below
    const isNotFoundError = error instanceof APIError && error.response?.status === 404;

    useEffect(() => {
        if (error && !isNotFoundError) {
            handleError(error);
        }
    }, [error, isNotFoundError, handleError]);

    // The slug lookup has settled without finding a user
    const hasResolvedMissingUser = !isCurrentUser && !!slug && !user && (isNotFoundError || fetchedUserData !== undefined);

    // Keep showing the last loaded user while a refetch is in flight, e.g.
    // when a slug change updates the URL and triggers a fetch by the new
    // slug — but not once the lookup has settled without finding a user
    const lastUserRef = useRef<User | undefined>(undefined);
    if (user) {
        lastUserRef.current = user;
    }
    const displayUser = user || (hasResolvedMissingUser ? undefined : lastUserRef.current);

    const notFoundSlug = hasResolvedMissingUser ? (slug ?? null) : null;
    const notFoundHandledRef = useRef<string | null>(null);

    useEffect(() => {
        if (!notFoundSlug || notFoundHandledRef.current === notFoundSlug) {
            return;
        }
        notFoundHandledRef.current = notFoundSlug;

        showToast({
            type: "error",
            message: "User not found",
        });

        if (currentUser && canAccessSettings(currentUser)) {
            // Replace the history entry so the back button doesn't return
            // to the dead URL and redirect again
            navigate("/settings/staff", { replace: true });
        } else {
            navigate("/", { crossApp: true });
        }
    }, [notFoundSlug, currentUser, navigate]);

    return displayUser ? <UserDetailContent user={displayUser} /> : null;
}
