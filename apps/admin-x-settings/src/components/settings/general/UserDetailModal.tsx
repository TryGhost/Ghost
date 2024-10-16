import ChangePasswordForm from './users/ChangePasswordForm';
import EmailNotifications from './users/EmailNotifications';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import ProfileBasics from './users/ProfileBasics';
import ProfileDetails from './users/ProfileDetails';
import React, {useCallback, useEffect} from 'react';
import StaffToken from './users/StaffToken';
import clsx from 'clsx';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useStaffUsers from '../../../hooks/useStaffUsers';
import validator from 'validator';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ConfirmationModal, Heading, Icon, ImageUpload, LimitModal, Menu, MenuItem, Modal, showToast} from '@tryghost/admin-x-design-system';
import {ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {User, canAccessSettings, hasAdminAccess, isAdminUser, isAuthorOrContributor, isEditorUser, isOwnerUser, useDeleteUser, useEditUser, useMakeOwner} from '@tryghost/admin-x-framework/api/users';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {validateFacebookUrl, validateTwitterUrl} from '../../../utils/socialUrls';

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
        const valid = !url || validator.isURL(url);
        return valid ? '' : 'Enter a valid URL';
    },
    bio: ({bio}) => {
        const valid = !bio || bio.length <= 200;
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
    facebook: ({facebook}) => {
        try {
            validateFacebookUrl(facebook || '');
            return '';
        } catch (e) {
            if (e instanceof Error) {
                return e.message;
            }
            return '';
        }
    },
    twitter: ({twitter}) => {
        try {
            validateTwitterUrl(twitter || '');
            return '';
        } catch (e) {
            if (e instanceof Error) {
                return e.message;
            }
            return '';
        }
    }
};

export interface UserDetailProps {
    user: User;
    setUserData: (user: User) => void;
    errors: {[key in keyof User]?: string};
    validateField: <K extends keyof User>(key: K, value: User[K]) => boolean;
    clearError: (key: keyof User) => void;
}

const UserMenuTrigger = (
    <button className='flex h-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] px-3 opacity-80 hover:opacity-100' type='button'>
        <span className='sr-only'>Actions</span>
        <Icon colorClass='text-white' name='ellipsis' size='md' />
    </button>
);

const UserDetailModalContent: React.FC<{user: User}> = ({user}) => {
    const {updateRoute} = useRouting();
    const {ownerUser} = useStaffUsers();
    const {currentUser} = useGlobalData();
    const handleError = useHandleError();
    const {formState, setFormState, saveState, handleSave, updateForm, errors, setErrors, clearError, okProps} = useForm({
        initialState: user,
        savingDelay: 500,
        savedDelay: 500,
        onValidate: (values) => {
            return Object.entries(validators).reduce<ErrorMessages>((newErrors, [key, validate]) => {
                const error = validate(values);
                if (error) {
                    newErrors[key] = error;
                }
                return newErrors;
            }, {});
        },
        onSave: async (values) => {
            await updateUser?.(values);
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
            updateRoute({isExternal: true, route: 'dashboard'});
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
            okColor: 'red',
            onOk: async (modal) => {
                const updatedUserData = {
                    ..._user,
                    status: _user.status === 'inactive' ? 'active' : 'inactive'
                };
                try {
                    await updateUser(updatedUserData);
                    setFormState(() => updatedUserData);
                    modal?.remove();
                    showToast({
                        title: _user.status === 'inactive' ? 'User un-suspended' : 'User suspended',
                        type: 'success'
                    });
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
                    <p className='mb-3'><span className='font-bold'>{_user.name || _user.email}</span> will be permanently deleted and all their posts will be automatically assigned to the <span className='font-bold'>{owner.name}</span>.</p>
                    <p>To make these easy to find in the future, each post will be given an internal tag of <span className='font-bold'>#{user.slug}</span></p>
                </>
            ),
            okLabel: 'Delete user',
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    await deleteUser(_user?.id);
                    modal?.remove();
                    mainModal?.remove();
                    navigateOnClose();
                    showToast({
                        title: 'User deleted',
                        type: 'success'
                    });
                } catch (e) {
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
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    await makeOwner(user.id);
                    modal?.remove();
                    showToast({
                        title: 'Ownership transferred',
                        type: 'success'
                    });
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
    let menuItems: MenuItem[] = [];

    if (isOwnerUser(currentUser) && isAdminUser(formState) && formState.status !== 'inactive') {
        menuItems.push({
            id: 'make-owner',
            label: 'Make owner',
            onClick: confirmMakeOwner
        });
    }

    if (formState.id !== currentUser.id && (
        (hasAdminAccess(currentUser) && !isOwnerUser(user)) ||
        (isEditorUser(currentUser) && isAuthorOrContributor(user))
    )) {
        let suspendUserLabel = formState.status === 'inactive' ? 'Un-suspend user' : 'Suspend user';

        menuItems.push({
            id: 'delete-user',
            label: 'Delete user',
            onClick: () => {
                confirmDelete(user, {owner: ownerUser});
            }
        }, {
            id: 'suspend-user',
            label: suspendUserLabel,
            onClick: () => {
                confirmSuspend(formState);
            }
        });
    }

    menuItems.push({
        id: 'view-user-activity',
        label: 'View user activity',
        onClick: () => {
            mainModal.remove();
            updateRoute(`history/view/${formState.id}`);
        }
    });

    const coverEditButtonBaseClasses = 'bg-[rgba(0,0,0,0.75)] rounded text-sm text-white flex items-center justify-center px-3 h-8 opacity-80 hover:opacity-100 transition-all cursor-pointer font-medium nowrap';

    const fileUploadButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const deleteButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const editButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const suspendedText = formState.status === 'inactive' ? ' (Suspended)' : '';

    return (
        <Modal
            afterClose={navigateOnClose}
            animate={canAccessSettings(currentUser)}
            backDrop={canAccessSettings(currentUser)}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            dirty={saveState === 'unsaved'}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            size={canAccessSettings(currentUser) ? 'lg' : 'bleed'}
            stickyFooter={true}
            testId='user-detail-modal'
            onOk={async () => {
                await (handleSave({fakeWhenUnchanged: true}));
            }}
        >
            <div>
                <div className={`relative ${canAccessSettings(currentUser) ? '-mx-8 -mt-8 rounded-t' : '-mx-10 -mt-10'} bg-gradient-to-tr from-grey-900 to-black`}>
                    <div className='flex min-h-[40vmin] flex-wrap items-end justify-between bg-cover bg-center' style={{
                        backgroundImage: `url(${formState.cover_image})`
                    }}>
                        <div className='flex w-full max-w-[620px] flex-col gap-5 p-8 md:max-w-[auto] md:flex-row md:items-center'>
                            <div>
                                <ImageUpload
                                    deleteButtonClassName='md:invisible absolute pr-3 -right-2 -top-2 flex h-8 w-10 cursor-pointer items-center justify-end rounded-full bg-[rgba(0,0,0,0.75)] text-white group-hover:!visible'
                                    deleteButtonContent={<Icon colorClass='text-white' name='trash' size='sm' />}
                                    editButtonClassName='md:invisible absolute right-[22px] -top-2 flex h-8 w-8 cursor-pointer items-center justify-center text-white group-hover:!visible z-20'
                                    fileUploadClassName='rounded-full bg-black flex items-center justify-center opacity-80 transition hover:opacity-100 -ml-2 cursor-pointer h-[80px] w-[80px]'
                                    fileUploadProps={{dragIndicatorClassName: 'rounded-full'}}
                                    id='avatar'
                                    imageClassName='w-full h-full object-cover rounded-full shrink-0'
                                    imageContainerClassName='relative group bg-cover bg-center -ml-2 h-[80px] w-[80px] shrink-0'
                                    imageURL={formState.profile_image ?? undefined}
                                    pintura={
                                        {
                                            isEnabled: editor.isEnabled,
                                            openEditor: async () => editor.openEditor({
                                                image: formState.profile_image || '',
                                                handleSave: async (file:File) => {
                                                    handleImageUpload('profile_image', file);
                                                }
                                            })
                                        }
                                    }
                                    unstyled={true}
                                    width='80px'
                                    onDelete={() => {
                                        handleImageDelete('profile_image');
                                    }}
                                    onUpload={(file: File) => {
                                        handleImageUpload('profile_image', file);
                                    }}
                                >
                                    <Icon colorClass='text-white' name='user-add' size='lg' />
                                </ImageUpload>
                            </div>
                            <div>
                                <Heading styles='break-words md:break-normal text-white'>{user.name}{suspendedText}</Heading>
                                <span className='text-md font-semibold capitalize text-white'>{user.roles[0].name.toLowerCase()}</span>
                            </div>
                        </div>
                        <div className='flex flex-nowrap items-end gap-4 p-8'>
                            <ImageUpload
                                buttonContainerClassName='flex items-end gap-4 justify-end flex-nowrap'
                                deleteButtonClassName={deleteButtonClasses}
                                deleteButtonContent='Delete cover image'
                                editButtonClassName={editButtonClasses}
                                fileUploadClassName={fileUploadButtonClasses}
                                id='cover-image'
                                imageClassName='hidden'
                                imageURL={formState.cover_image || ''}
                                pintura={
                                    {
                                        isEnabled: editor.isEnabled,
                                        openEditor: async () => editor.openEditor({
                                            image: formState.cover_image || '',
                                            handleSave: async (file:File) => {
                                                handleImageUpload('cover_image', file);
                                            }
                                        })
                                    }
                                }
                                unstyled
                                onDelete={() => {
                                    handleImageDelete('cover_image');
                                }}
                                onUpload={(file: File) => {
                                    handleImageUpload('cover_image', file);
                                }}
                            >Upload cover image</ImageUpload>
                            {showMenu && <div className="z-10">
                                <Menu items={menuItems} position='end' trigger={UserMenuTrigger} />
                            </div>}
                        </div>
                    </div>
                </div>
                <div className={`${!canAccessSettings(currentUser) && 'mx-auto max-w-4xl'} mt-10 grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2`}>
                    <ProfileBasics clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} />
                    <div className='flex flex-col justify-between gap-10'>
                        <ProfileDetails clearError={clearError} errors={errors} setUserData={setUserData} user={formState} validateField={validateField} />
                        {user.id === currentUser.id && <StaffToken />}
                    </div>
                    <EmailNotifications setUserData={setUserData} user={formState} />
                    <ChangePasswordForm user={formState} />
                </div>
            </div>
        </Modal>
    );
};

const UserDetailModal: React.FC<RoutingModalProps> = ({params}) => {
    const {users, hasNextPage, fetchNextPage} = useStaffUsers();
    const {currentUser} = useGlobalData();
    const user = currentUser.slug === params?.slug ? currentUser : users.find(({slug}) => slug === params?.slug);

    useEffect(() => {
        if (!user && hasNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, user]);

    if (user) {
        return <UserDetailModalContent user={user} />;
    } else {
        return null;
    }
};

export default NiceModal.create(UserDetailModal);
