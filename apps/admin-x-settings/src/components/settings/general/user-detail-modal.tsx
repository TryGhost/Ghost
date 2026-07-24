import ConfirmationModal from '../../confirmation-modal';
import EmailNotificationsTab from './users/email-notifications-tab';
import LimitModal from '../../limit-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import ProfileTab from './users/profile-tab';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import SocialLinksTab from './users/social-links-tab';
import clsx from 'clsx';
import usePinturaEditor from '../../../hooks/use-pintura-editor';
import useStaffUsers from '../../../hooks/use-staff-users';
import validator from 'validator';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Dropzone, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {type ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {HostLimitError, useLimiter} from '../../../hooks/use-limiter';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';
import {Pencil, Trash2} from 'lucide-react';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SOCIAL_PLATFORM_CONFIGS, SOCIAL_PLATFORM_KEYS, getSocialValidationError} from '../../../utils/social-urls/index';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Text} from '@tryghost/shade/primitives';
import {type User, canAccessSettings, hasAdminAccess, isAdminUser, isAuthorOrContributor, isEditorUser, isOwnerUser, useDeleteUser, useEditUser, useGetUserBySlug, useMakeOwner} from '@tryghost/admin-x-framework/api/users';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {toast} from 'sonner';
import {useGlobalData} from '../../providers/global-data-provider';

const validators: Record<string, (u: Partial<User>) => string> = {
    name: ({name}) => {
        let error = '';

        if (!name) {
            error = 'Name is required';
        }

        if (name && name.length > 191) {
            error = 'Name is too long';
        }

        return error;
    },
    email: ({email}) => {
        const valid = validator.isEmail(email || '');
        return valid ? '' : 'Enter a valid email address';
    },
    url: ({url}) => {
        // require_tld is automatically true in validator 8+, we set it false here for our default localhost setup
        const valid = !url || validator.isURL(url, {require_tld: false});
        return valid ? '' : 'Enter a valid URL';
    },
    bio: ({bio}) => {
        const valid = !bio || bio.length <= 250;
        return valid ? '' : 'Bio is too long';
    },
    location: ({location}) => {
        const valid = !location || location.length <= 150;
        return valid ? '' : 'Location is too long';
    },
    website: ({website}) => {
        const valid = !website || (validator.isURL(website) && website.length <= 2000);
        return valid ? '' : 'Enter a valid URL';
    },
    ...Object.fromEntries(SOCIAL_PLATFORM_CONFIGS.map(config => [
        config.key,
        (values: Partial<User>) => getSocialValidationError(config.key, values[config.key] as string | null | undefined)
    ]))
};

export interface UserDetailProps {
    user: User;
    setUserData: (user: User) => void;
    errors: {[key in keyof User]?: string};
    validateField: <K extends keyof User>(key: K, value: User[K]) => boolean;
    clearError: (key: keyof User) => void;
}

const UserDetailModalContent: React.FC<{user: User; onDeletingUserChange: (isDeleting: boolean) => void}> = ({user, onDeletingUserChange}) => {
    const {updateRoute, route} = useRouting();

    const getTabFromPath = (path: string): string => {
        const lastSegment = path.split('/').pop() || '';

        if (lastSegment === 'social-links' || lastSegment === 'email-notifications') {
            return lastSegment;
        }

        return 'profile';
    };
    const {ownerUser} = useStaffUsers();
    const {currentUser} = useGlobalData();
    const handleError = useHandleError();
    const {formState, setFormState, saveState, handleSave, updateForm, errors, setErrors, clearError, okProps} = useForm({
        initialState: user,
        savingDelay: 500,
        savedDelay: 500,
        onValidate: (values) => {
            return Object.entries(validators).reduce<ErrorMessages>((newErrors, [key, validate]) => {
                // a stored social handle that predates a validation-rule
                // tightening (see ONC-1856 follow-ups) must not block saving
                // an unrelated field on this modal — only re-validate a
                // platform the user actually changed from what was loaded
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
                const tab = getTabFromPath(route);
                const urlSegment = tab === 'profile' ? '' : `/${tab}`;
                updateRoute({route: `staff/${savedUser.slug}${urlSegment}`, replace: true});
            }
        },
        onSaveError: handleError
    });
    const setUserData = (newData: User) => updateForm(() => newData);
    const validateField = <K extends keyof User>(key: K, value: User[K]) => {
        const error = validators[key]?.({[key]: value});
        if (error) {
            setErrors({...errors, [key]: error});
            return false;
        } else {
            clearError(key);
            return true;
        }
    };

    const mainModal = useModal();
    const {mutateAsync: uploadImage} = useUploadImage();
    const {mutateAsync: updateUser} = useEditUser();
    const {mutateAsync: deleteUser} = useDeleteUser();
    const {mutateAsync: makeOwner} = useMakeOwner();
    const limiter = useLimiter();

    // Pintura integration
    const editor = usePinturaEditor();

    const navigateOnClose = useCallback(() => {
        if (canAccessSettings(currentUser)) {
            updateRoute('staff');
        } else {
            // Contributors can't access settings, exit to let the shell handle navigation
            updateRoute({isExternal: true, route: ''});
        }
    }, [currentUser, updateRoute]);

    const confirmSuspend = async (_user: User) => {
        if (_user.status === 'inactive' && _user.roles[0].name !== 'Contributor') {
            try {
                await limiter?.errorIfWouldGoOverLimit('staff');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        formSheet: true,
                        prompt: error.message || `Your current plan doesn't support more users.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                    });
                    return;
                } else {
                    throw error;
                }
            }
        }

        let warningText = 'This user will no longer be able to log in but their posts will be kept.';
        if (_user.status === 'inactive') {
            warningText = 'This user will be able to log in again and will have the same permissions they had previously.';
        }
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure you want to suspend this user?',
            prompt: (
                <>
                    <strong>WARNING:</strong> {warningText}
                </>
            ),
            okLabel: _user.status === 'inactive' ? 'Un-suspend' : 'Suspend',
            okRunningLabel: _user.status === 'inactive' ? 'Un-suspending...' : 'Suspending...',
            okVariant: 'destructive',
            onOk: async (modal) => {
                const updatedUserData = {
                    ..._user,
                    status: _user.status === 'inactive' ? 'active' : 'inactive'
                };
                try {
                    await updateUser(updatedUserData);
                    setFormState(() => updatedUserData);
                    modal?.remove();
                    toast.success(_user.status === 'inactive' ? 'User un-suspended' : 'User suspended');
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    const confirmDelete = (_user: User, {owner}: {owner: User}) => {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure you want to delete this user?',
            prompt: (
                <>
                    <p className='mb-3'><span className='font-bold'>{_user.name || _user.email}</span> will be permanently deleted and all their posts will be automatically assigned to <span className='font-bold'>{owner.name}</span>.</p>
                    <p>To make these easy to find in the future, each post will be given an internal tag of <span className='font-bold'>#{user.slug}</span></p>
                </>
            ),
            okLabel: 'Delete user',
            okVariant: 'destructive',
            onOk: async (modal) => {
                onDeletingUserChange(true);
                try {
                    await deleteUser(_user?.id);
                    modal?.remove();
                    mainModal?.remove();
                    navigateOnClose();
                    // Let the destination route mount its toaster before publishing the success state.
                    setTimeout(() => toast.success('User deleted'), 100);
                } catch (e) {
                    onDeletingUserChange(false);
                    handleError(e);
                }
            }
        });
    };

    const confirmMakeOwner = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Transfer Ownership',
            prompt: 'Are you sure you want to transfer the ownership of this blog? You will not be able to undo this action.',
            okLabel: 'Yep — I\'m sure',
            okVariant: 'destructive',
            onOk: async (modal) => {
                try {
                    await makeOwner(user.id);
                    modal?.remove();
                    toast.success('Ownership transferred');
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    const handleImageUpload = async (image: string, file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));

            switch (image) {
            case 'cover_image':
                updateForm((_user) => {
                    return {..._user, cover_image: imageUrl};
                });
                break;
            case 'profile_image':
                updateForm((_user) => {
                    return {..._user, profile_image: imageUrl};
                });
                break;
            }
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = (image: string) => {
        switch (image) {
        case 'cover_image':
            updateForm((_user) => {
                return {..._user, cover_image: ''};
            });
            break;
        case 'profile_image':
            updateForm((_user) => {
                return {..._user, profile_image: ''};
            });
            break;
        }
    };

    const showMenu = hasAdminAccess(currentUser) || (isEditorUser(currentUser) && isAuthorOrContributor(user));
    const canMakeOwner = isOwnerUser(currentUser) && isAdminUser(formState) && formState.status !== 'inactive';
    const canSuspendUser = formState.id !== currentUser.id && (
        (hasAdminAccess(currentUser) && !isOwnerUser(user)) ||
        (isEditorUser(currentUser) && isAuthorOrContributor(user))
    );
    const suspendUserLabel = formState.status === 'inactive' ? 'Un-suspend user' : 'Suspend user';

    const coverButtonClasses = 'h-8 bg-surface-inverse px-3 text-surface-inverse-foreground opacity-80 hover:bg-surface-inverse/90 hover:text-surface-inverse-foreground hover:opacity-100';

    const suspendedText = formState.status === 'inactive' ? ' (Suspended)' : '';

    const initialTab = getTabFromPath(route);
    const [selectedTab, setSelectedTab] = useState<string>(initialTab);

    const handleTabChange = (newTabId: string) => {
        const urlSegment = newTabId === 'profile' ? '' : `/${newTabId}`;

        updateRoute(`staff/${user.slug}${urlSegment}`);
        setSelectedTab(newTabId);
    };

    return (
        <SettingsModal
            afterClose={navigateOnClose}
            animate={canAccessSettings(currentUser)}
            backDrop={canAccessSettings(currentUser)}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            dirty={saveState === 'unsaved'}
            hideXOnMobile={true}
            okLabel={okProps.label || 'Save'}
            okVariant={okProps.variant}
            size={canAccessSettings(currentUser) ? 'md' : 'bleed'}
            stickyFooter={true}
            testId='user-detail-modal'
            width={canAccessSettings(currentUser) ? 600 : 'full'}
            onOk={async () => {
                await (handleSave({fakeWhenUnchanged: true}));
            }}
        >
            <div>
                <div className={`relative ${canAccessSettings(currentUser) ? '-mx-8 -mt-8 rounded-t' : '-mx-10 -mt-10'}`}>
                    <div className={`flex flex-wrap items-end justify-between gap-8 p-8 ${formState.cover_image ? 'bg-cover bg-center' : ''} ${!canAccessSettings(currentUser) && 'min-h-[30vmin]'}`}
                        style={{
                            backgroundImage: formState.cover_image ? `url(${formState.cover_image})` : 'none'
                        }}>
                        <div className='flex w-full flex-col gap-2'>
                            <div className='flex flex-nowrap items-start justify-between gap-3'>
                                <div>
                                    <ImageUpload className='-ml-1 size-20 overflow-visible rounded-full'>
                                        {formState.profile_image ? (
                                            <ImageUploadPreview className='rounded-full'>
                                                <ImageUploadImage data-testid='profile-image-preview' id='avatar' src={formState.profile_image} />
                                                <ImageUploadActions className='top-1 right-1'>
                                                    {editor.isEnabled && <ImageUploadAction aria-label='Edit profile image' className='rounded-full' onClick={() => editor.openEditor({
                                                        image: formState.profile_image || '',
                                                        handleSave: async (file: File) => handleImageUpload('profile_image', file)
                                                    })}><Pencil /></ImageUploadAction>}
                                                    <ImageUploadAction aria-label='Remove profile image' className='rounded-full' onClick={() => handleImageDelete('profile_image')}><Trash2 /></ImageUploadAction>
                                                </ImageUploadActions>
                                            </ImageUploadPreview>
                                        ) : (
                                            <ImageUploadDropzone className='rounded-full bg-surface-inverse text-surface-inverse-foreground opacity-80 hover:opacity-100' inputId='avatar' inputTestId='profile-image-upload' onDropAccepted={files => handleImageUpload('profile_image', files[0])}>
                                                <LucideIcon.UserPlus className='size-8 text-surface-inverse-foreground' />
                                            </ImageUploadDropzone>
                                        )}
                                    </ImageUpload>
                                </div>
                                <div className='flex flex-nowrap items-start gap-3'>
                                    {formState.cover_image ? <div className='flex flex-nowrap items-end justify-end gap-4'>
                                        <img alt='' className='hidden' data-testid='cover-image-preview' src={formState.cover_image} />
                                        {editor.isEnabled && <Button className={coverButtonClasses} type='button' onClick={() => editor.openEditor({
                                            image: formState.cover_image || '',
                                            handleSave: async (file: File) => handleImageUpload('cover_image', file)
                                        })}>Edit cover image</Button>}
                                        <Button className={coverButtonClasses} type='button' onClick={() => handleImageDelete('cover_image')}>Delete cover image</Button>
                                    </div> : <Dropzone className='h-8' inputId='cover-image' inputTestId='cover-image-upload' variant='button' onDropAccepted={files => handleImageUpload('cover_image', files[0])}>Upload cover image</Dropzone>}
                                    {showMenu && <div className="z-10">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className={clsx(
                                                        'flex h-8 cursor-pointer items-center justify-center rounded px-3',
                                                        formState.cover_image
                                                            ? 'bg-[rgba(0,0,0,0.75)] opacity-80 hover:opacity-100'
                                                            : 'border border-grey-300 bg-transparent text-black dark:border-grey-800 dark:text-white'
                                                    )}
                                                    type='button'
                                                >
                                                    <span className='sr-only'>Actions</span>
                                                    <LucideIcon.Ellipsis className={clsx('size-5', formState.cover_image && 'text-white')} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            {/* legacy SettingsModal overlay is z-[1000]; keep the portalled menu above it */}
                                            <DropdownMenuContent align='end' className='z-[9999]'>
                                                {canMakeOwner && (
                                                    <DropdownMenuItem onSelect={confirmMakeOwner}>
                                                        Make owner
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => {
                                                    mainModal.remove();
                                                    updateRoute(`history/view/${formState.id}`);
                                                }}>
                                                    View user activity
                                                </DropdownMenuItem>
                                                {canSuspendUser && (
                                                    <>
                                                        <DropdownMenuItem onSelect={() => {
                                                            confirmSuspend(formState);
                                                        }}>
                                                            {suspendUserLabel}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className='text-destructive focus:text-destructive'
                                                            onSelect={() => {
                                                                confirmDelete(user, {owner: ownerUser});
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
                                <Text as='h3' className={clsx('break-words md:text-2xl md:break-normal', formState.cover_image ? 'text-white' : 'text-foreground')} leading='heading' size='xl' weight='bold'>{user.name}{suspendedText}</Text>
                                <span className={clsx('text-md font-medium capitalize', formState.cover_image ? 'text-white' : 'text-black dark:text-white')}>{user.roles[0].name.toLowerCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`${!canAccessSettings(currentUser) && 'mx-auto max-w-[536px]'} mt-6 flex flex-col`}>
                    <Tabs value={selectedTab} variant='underline' onValueChange={handleTabChange}>
                        <TabsList>
                            <TabsTrigger title='Profile' value='profile'>Profile</TabsTrigger>
                            <TabsTrigger title='Social Links' value='social-links'>Social Links</TabsTrigger>
                            <TabsTrigger title='Email Notifications' value='email-notifications'>Email Notifications</TabsTrigger>
                        </TabsList>
                        <TabsContent className='pt-4' value='profile'><ProfileTab clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} /></TabsContent>
                        <TabsContent className='pt-4' value='social-links'><SocialLinksTab clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} /></TabsContent>
                        <TabsContent className='pt-4' value='email-notifications'><EmailNotificationsTab setUserData={setUserData} user={formState} /></TabsContent>
                    </Tabs>
                </div>
            </div>
        </SettingsModal>
    );
};

const UserDetailModal: React.FC<RoutingModalProps> = ({params}) => {
    const {currentUser} = useGlobalData();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    // Skip API call if it's the current user (we already have their data)
    const isCurrentUser = currentUser.slug === params?.slug;

    // Fetch user by slug if it's not the current user
    const {data: fetchedUserData, error} = useGetUserBySlug(
        params?.slug || '',
        {enabled: !isCurrentUser && !!params?.slug, defaultErrorHandler: false}
    );

    // Use current user data or fetched user data
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
    const hasResolvedMissingUser = !isCurrentUser && !!params?.slug && !user && (isNotFoundError || fetchedUserData !== undefined);

    // Keep showing the last loaded user while a refetch is in flight, e.g.
    // when a slug change updates the URL and triggers a fetch by the new
    // slug — but not once the lookup has settled without finding a user
    const lastUserRef = useRef<User | undefined>(undefined);
    if (user) {
        lastUserRef.current = user;
    }
    const displayUser = user || (hasResolvedMissingUser ? undefined : lastUserRef.current);

    const notFoundSlug = hasResolvedMissingUser ? (params?.slug ?? null) : null;
    const notFoundHandledRef = useRef<string | null>(null);

    useEffect(() => {
        if (!notFoundSlug || isDeletingUser || notFoundHandledRef.current === notFoundSlug) {
            return;
        }
        notFoundHandledRef.current = notFoundSlug;

        toast.error('User not found');

        if (canAccessSettings(currentUser)) {
            // Replace the history entry so the back button doesn't return
            // to the dead URL and redirect again
            updateRoute({route: 'staff', replace: true});
        } else {
            updateRoute({isExternal: true, route: ''});
        }
    }, [notFoundSlug, isDeletingUser, currentUser, updateRoute]);

    return displayUser ? <UserDetailModalContent user={displayUser} onDeletingUserChange={setIsDeletingUser} /> : null;
};

export default NiceModal.create(UserDetailModal);
