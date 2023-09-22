import APIKeys from '../advanced/integrations/APIKeys';
import ChangePasswordForm from './users/ChangePasswordForm';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import Heading from '../../../admin-x-ds/global/Heading';
import Icon from '../../../admin-x-ds/global/Icon';
import ImageUpload from '../../../admin-x-ds/global/form/ImageUpload';
import LimitModal from '../../../admin-x-ds/global/modal/LimitModal';
import Menu, {MenuItem} from '../../../admin-x-ds/global/Menu';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import React, {useCallback, useEffect, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import clsx from 'clsx';
import handleError from '../../../utils/handleError';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import useRouting from '../../../hooks/useRouting';
import useStaffUsers from '../../../hooks/useStaffUsers';
import validator from 'validator';
import {DetailsInputs} from './DetailsInputs';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {RoutingModalProps} from '../../providers/RoutingProvider';
import {User, canAccessSettings, hasAdminAccess, isAdminUser, isAuthorOrContributor, isEditorUser, isOwnerUser, useDeleteUser, useEditUser, useMakeOwner} from '../../../api/users';
import {genStaffToken, getStaffToken} from '../../../api/staffToken';
import {getImageUrl, useUploadImage} from '../../../api/images';
import {getSettingValues} from '../../../api/settings';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';
import {useBrowseRoles} from '../../../api/roles';
import {useGlobalData} from '../../providers/GlobalDataProvider';

interface CustomHeadingProps {
    children?: React.ReactNode;
}

export interface UserDetailProps {
    user: User;
    setUserData?: (user: User) => void;
    errors?: {
        name?: string;
        url?: string;
        email?: string;
    };
    validators?: {
        name: (name: string) => boolean,
        email: (email: string) => boolean,
        url: (url: string) => boolean
    }
}

const CustomHeader: React.FC<CustomHeadingProps> = ({children}) => {
    return (
        <Heading level={4}>{children}</Heading>
    );
};

const RoleSelector: React.FC<UserDetailProps> = ({user, setUserData}) => {
    const {data: {roles} = {}} = useBrowseRoles();

    if (isOwnerUser(user)) {
        return (
            <>
                <Heading level={6}>Role</Heading>
                <div className='flex h-[295px] flex-col items-center justify-center gap-3 bg-grey-75 px-10 py-20 text-center text-sm text-grey-800 dark:bg-grey-950 dark:text-white'>
                    <Icon colorClass='text-grey-800 dark:text-white' name='crown' size='lg' />
                    This user is the owner of the site. To change their role, you need to transfer the ownership first.
                </div>
            </>
        );
    }

    return (
        <Radio
            id='role'
            options={[
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
            ]}
            selectedOption={user.roles[0].name.toLowerCase()}
            title="Role"
            onSelect={(value) => {
                const role = roles?.find(r => r.name.toLowerCase() === value.toLowerCase());
                if (role) {
                    setUserData?.({...user, roles: [role]});
                }
            }}
        />
    );
};

const BasicInputs: React.FC<UserDetailProps> = ({errors, validators, user, setUserData}) => {
    const {currentUser} = useGlobalData();

    return (
        <SettingGroupContent>
            <TextField
                error={!!errors?.name}
                hint={errors?.name || 'Use real name so people can recognize you'}
                title="Full name"
                value={user.name}
                onBlur={(e) => {
                    validators?.name(e.target.value);
                }}
                onChange={(e) => {
                    setUserData?.({...user, name: e.target.value});
                }}
            />
            <TextField
                error={!!errors?.email}
                hint={errors?.email || 'Used for notifications'}
                title="Email"
                value={user.email}
                onBlur={(e) => {
                    validators?.email(e.target.value);
                }}
                onChange={(e) => {
                    setUserData?.({...user, email: e.target.value});
                }}
            />
            <TextField
                hint="https://example.com/author"
                title="Slug"
                value={user.slug}
                onChange={(e) => {
                    setUserData?.({...user, slug: e.target.value});
                }}
            />
            {hasAdminAccess(currentUser) && <RoleSelector setUserData={setUserData} user={user} />}
        </SettingGroupContent>
    );
};

const Basic: React.FC<UserDetailProps> = ({errors, validators, user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Basic info</CustomHeader>}
            title='Basic'
        >
            <BasicInputs errors={errors} setUserData={setUserData} user={user} validators={validators} />
        </SettingGroup>
    );
};

const Details: React.FC<UserDetailProps> = ({errors, validators, user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Details</CustomHeader>}
            title='Details'
        >
            <DetailsInputs errors={errors} setUserData={setUserData} user={user} validators={validators} />
        </SettingGroup>
    );
};

const EmailNotificationsInputs: React.FC<UserDetailProps> = ({user, setUserData}) => {
    const hasWebmentions = useFeatureFlag('webmentions');
    const hasRecommendations = useFeatureFlag('recommendations');
    const {currentUser} = useGlobalData();

    return (
        <SettingGroupContent>
            <Toggle
                checked={user.comment_notifications}
                direction='rtl'
                hint='Every time a member comments on one of your posts'
                label='Comments'
                onChange={(e) => {
                    setUserData?.({...user, comment_notifications: e.target.checked});
                }}
            />
            {hasAdminAccess(currentUser) && <>
                {hasWebmentions && <Toggle
                    checked={user.mention_notifications}
                    direction='rtl'
                    hint='Every time another site links to your work'
                    label='Mentions'
                    onChange={(e) => {
                        setUserData?.({...user, mention_notifications: e.target.checked});
                    }}
                />}
                {hasRecommendations && <Toggle
                    checked={user.recommendation_notifications}
                    direction='rtl'
                    hint='Every time another site recommends your work'
                    label='Recommendations'
                    onChange={(e) => {
                        setUserData?.({...user, recommendation_notifications: e.target.checked});
                    }}
                />}
                <Toggle
                    checked={user.free_member_signup_notification}
                    direction='rtl'
                    hint='Every time a new free member signs up'
                    label='New signups'
                    onChange={(e) => {
                        setUserData?.({...user, free_member_signup_notification: e.target.checked});
                    }}
                />
                <Toggle
                    checked={user.paid_subscription_started_notification}
                    direction='rtl'
                    hint='Every time a member starts a new paid subscription'
                    label='New paid members'
                    onChange={(e) => {
                        setUserData?.({...user, paid_subscription_started_notification: e.target.checked});
                    }}
                />
                <Toggle
                    checked={user.paid_subscription_canceled_notification}
                    direction='rtl'
                    hint='Every time a member cancels their paid subscription'
                    label='Paid member cancellations'
                    onChange={(e) => {
                        setUserData?.({...user, paid_subscription_canceled_notification: e.target.checked});
                    }}
                />
                <Toggle
                    checked={user.milestone_notifications}
                    direction='rtl'
                    hint='Occasional summaries of your audience & revenue growth'
                    label='Milestones'
                    onChange={(e) => {
                        setUserData?.({...user, milestone_notifications: e.target.checked});
                    }}
                />
            </>}
        </SettingGroupContent>
    );
};

const EmailNotifications: React.FC<UserDetailProps> = ({user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Email notifications</CustomHeader>}
            title='Email notifications'

        >
            <EmailNotificationsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

const StaffToken: React.FC<UserDetailProps> = () => {
    const {refetch: apiKey} = getStaffToken({
        enabled: false
    });
    const [token, setToken] = useState('');
    const {mutateAsync: newApiKey} = genStaffToken();

    useEffect(() => {
        const getApiKey = async () => {
            const newAPI = await apiKey();
            if (newAPI) {
                setToken(newAPI?.data?.apiKey?.secret || '');
            }
        };
        getApiKey();
    } , [apiKey]);

    const genConfirmation = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Regenerate your Staff Access Token',
            prompt: 'You can regenerate your Staff Access Token any time, but any scripts or applications using it will need to be updated.',
            okLabel: 'Regenerate your Staff Access Token',
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    const newAPI = await newApiKey([]);
                    setToken(newAPI?.apiKey?.secret || '');
                    modal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };
    return (
        <div>
            <Heading className='mb-2' level={6} grey>Staff access token</Heading>
            <APIKeys hasLabel={false} keys={[
                {
                    text: token || '',
                    onRegenerate: genConfirmation
                }]} />
        </div>
    );
};

const UserMenuTrigger = () => (
    <button className='flex h-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] px-3 opacity-80 hover:opacity-100' type='button'>
        <span className='sr-only'>Actions</span>
        <Icon colorClass='text-white' name='ellipsis' size='md' />
    </button>
);

const UserDetailModalContent: React.FC<{user: User}> = ({user}) => {
    const {updateRoute} = useRouting();
    const {ownerUser} = useStaffUsers();
    const {currentUser} = useGlobalData();
    const [userData, _setUserData] = useState(user);
    const [saveState, setSaveState] = useState<'' | 'unsaved' | 'saving' | 'saved'>('');
    const [errors, setErrors] = useState<{
        name?: string;
        email?: string;
        url?: string;
    }>({});

    const setUserData = (newUserData: User | ((current: User) => User)) => {
        _setUserData(newUserData);
        setSaveState('unsaved');
    };

    const mainModal = useModal();
    const {mutateAsync: uploadImage} = useUploadImage();
    const {mutateAsync: updateUser} = useEditUser();
    const {mutateAsync: deleteUser} = useDeleteUser();
    const {mutateAsync: makeOwner} = useMakeOwner();
    const limiter = useLimiter();

    // Pintura integration
    const {settings} = useGlobalData();
    const [pintura] = getSettingValues<boolean>(settings, ['pintura']);
    const [pinturaJsUrl] = getSettingValues<string>(settings, ['pintura_js_url']);
    const [pinturaCssUrl] = getSettingValues<string>(settings, ['pintura_css_url']);
    const pinturaEnabled = Boolean(pintura) && Boolean(pinturaJsUrl) && Boolean(pinturaCssUrl);

    const editor = usePinturaEditor(
        {config: {
            jsUrl: pinturaJsUrl || '',
            cssUrl: pinturaCssUrl || ''
        },
        disabled: !pinturaEnabled}
    );

    const navigateOnClose = useCallback(() => {
        if (canAccessSettings(currentUser)) {
            updateRoute('users');
        } else {
            updateRoute({isExternal: true, route: 'dashboard'});
        }
    }, [currentUser, updateRoute]);

    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                mainModal.remove();
                navigateOnClose();
            }, 300);
        }
    }, [mainModal, navigateOnClose, saveState, updateRoute]);

    const confirmSuspend = async (_user: User) => {
        if (_user.status === 'inactive' && _user.roles[0].name !== 'Contributor') {
            try {
                await limiter?.errorIfWouldGoOverLimit('staff');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        formSheet: true,
                        prompt: error.message || `Your current plan doesn't support more users.`
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
                    setUserData(updatedUserData);
                    modal?.remove();
                    showToast({
                        message: _user.status === 'inactive' ? 'User un-suspended' : 'User suspended',
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
                    showToast({
                        message: 'User deleted',
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
                        message: 'Ownership transferred',
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
                setUserData?.((_user) => {
                    return {..._user, cover_image: imageUrl};
                });
                break;
            case 'profile_image':
                setUserData?.((_user) => {
                    return {..._user, profile_image: imageUrl};
                });
                break;
            }
        } catch (e) {
            handleError(e);
        }
    };

    const handleImageDelete = (image: string) => {
        switch (image) {
        case 'cover_image':
            setUserData?.((_user) => {
                return {..._user, cover_image: ''};
            });
            break;
        case 'profile_image':
            setUserData?.((_user) => {
                return {..._user, profile_image: ''};
            });
            break;
        }
    };

    const showMenu = hasAdminAccess(currentUser) || (isEditorUser(currentUser) && isAuthorOrContributor(user));
    let menuItems: MenuItem[] = [];

    if (isOwnerUser(currentUser) && isAdminUser(userData) && userData.status !== 'inactive') {
        menuItems.push({
            id: 'make-owner',
            label: 'Make owner',
            onClick: confirmMakeOwner
        });
    }

    if (userData.id !== currentUser.id && (
        (hasAdminAccess(currentUser) && !isOwnerUser(user)) ||
        (isEditorUser(currentUser) && isAuthorOrContributor(user))
    )) {
        let suspendUserLabel = userData.status === 'inactive' ? 'Un-suspend user' : 'Suspend user';

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
                confirmSuspend(userData);
            }
        });
    }

    menuItems.push({
        id: 'view-user-activity',
        label: 'View user activity',
        onClick: () => {
            mainModal.remove();
            updateRoute(`history/view/${userData.id}`);
        }
    });

    let okLabel = saveState === 'saved' ? 'Saved' : 'Save & close';

    if (saveState === 'saving') {
        okLabel = 'Saving...';
    } else if (saveState === 'saved') {
        okLabel = 'Saved';
    }

    const coverButtonContainerClassName = clsx(
        showMenu ? (
            userData.cover_image ? 'relative ml-10 mr-[106px] flex translate-y-[-80px] gap-3 md:ml-0 md:justify-end' : 'relative -mb-8 ml-10 mr-[106px] flex translate-y-[358px] md:ml-0 md:translate-y-[268px] md:justify-end'
        ) : (
            userData.cover_image ? 'relative ml-10 flex max-w-4xl translate-y-[-80px] gap-3 md:mx-auto md:justify-end' : 'relative -mb-8 ml-10 flex max-w-4xl translate-y-[358px] md:mx-auto md:translate-y-[268px] md:justify-end'
        )
    );

    const coverEditButtonBaseClasses = 'bg-[rgba(0,0,0,0.75)] rounded text-sm text-white flex items-center justify-center px-3 h-8 opacity-80 hover:opacity-100 transition-all cursor-pointer font-medium';

    const fileUploadButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const deleteButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const editButtonClasses = clsx(
        coverEditButtonBaseClasses
    );

    const suspendedText = userData.status === 'inactive' ? ' (Suspended)' : '';

    const validators = {
        name: (name: string) => {
            setErrors?.((_errors) => {
                return {..._errors, name: name ? '' : 'Please enter a name'};
            });
            return !!name;
        },
        email: (email: string) => {
            const valid = validator.isEmail(email);
            setErrors?.((_errors) => {
                return {..._errors, email: valid ? '' : 'Please enter a valid email address'};
            });
            return valid;
        },
        url: (url: string) => {
            const valid = !url || validator.isURL(url);
            setErrors?.((_errors) => {
                return {..._errors, url: valid ? '' : 'Please enter a valid URL'};
            });
            return valid;
        }
    };

    return (
        <Modal
            afterClose={navigateOnClose}
            animate={canAccessSettings(currentUser)}
            backDrop={canAccessSettings(currentUser)}
            dirty={saveState === 'unsaved'}
            okLabel={okLabel}
            size={canAccessSettings(currentUser) ? 'lg' : 'bleed'}
            stickyFooter={true}
            testId='user-detail-modal'
            onOk={async () => {
                setSaveState('saving');
                let error = false;
                if (!validators.name(userData.name) || !validators.email(userData.email) || !validators.url(userData.website)) {
                    error = true;
                }

                if (error) {
                    showToast({
                        type: 'pageError',
                        message: 'Can\'t save user, please double check that you\'ve filled all mandatory fields.'
                    });
                    setSaveState('');
                    return;
                }

                toast.dismiss();

                await updateUser?.(userData);
                setSaveState('saved');
            }}
        >
            <div>
                <div className={`relative -mx-10 -mt-10 ${canAccessSettings(currentUser) && 'rounded-t'} bg-gradient-to-tr from-grey-900 to-black`}>
                    <ImageUpload
                        buttonContainerClassName={coverButtonContainerClassName}
                        deleteButtonClassName={deleteButtonClasses}
                        deleteButtonContent='Delete cover image'
                        editButtonClassName={editButtonClasses}
                        fileUploadClassName={fileUploadButtonClasses}
                        height={userData.cover_image ? '100%' : '32px'}
                        id='cover-image'
                        imageClassName='w-full h-full object-cover'
                        imageContainerClassName={`absolute inset-0 bg-cover group bg-center ${canAccessSettings(currentUser) && 'rounded-t'} overflow-hidden`}
                        imageURL={userData.cover_image || ''}
                        pintura={
                            {
                                isEnabled: pinturaEnabled,
                                openEditor: async () => editor.openEditor({
                                    image: userData.cover_image || '',
                                    handleSave: async (file:File) => {
                                        handleImageUpload('cover_image', file);
                                    }
                                })
                            }
                        }
                        unstyled={true}
                        onDelete={() => {
                            handleImageDelete('cover_image');
                        }}
                        onUpload={(file: File) => {
                            handleImageUpload('cover_image', file);
                        }}
                    >Upload cover image</ImageUpload>
                    {showMenu && <div className="absolute bottom-12 right-12 z-10">
                        <Menu items={menuItems} position='right' trigger={<UserMenuTrigger />}></Menu>
                    </div>}
                    <div className={`${!canAccessSettings(currentUser) ? 'mx-10 pl-0 md:max-w-[50%] min-[920px]:ml-[calc((100vw-920px)/2)] min-[920px]:max-w-[460px]' : 'max-w-[50%] pl-12'} relative flex flex-col items-start gap-4 pb-60 pt-10 md:flex-row md:items-center md:pb-7 md:pt-60`}>
                        <ImageUpload
                            deleteButtonClassName='md:invisible absolute pr-3 -right-2 -top-2 flex h-8 w-16 cursor-pointer items-center justify-end rounded-full bg-[rgba(0,0,0,0.75)] text-white group-hover:!visible'
                            deleteButtonContent={<Icon colorClass='text-white' name='trash' size='sm' />}
                            editButtonClassName='md:invisible absolute right-[22px] -top-2 flex h-8 w-8 cursor-pointer items-center justify-center text-white group-hover:!visible z-20'
                            fileUploadClassName='rounded-full bg-black flex items-center justify-center opacity-80 transition hover:opacity-100 -ml-2 cursor-pointer h-[80px] w-[80px]'
                            id='avatar'
                            imageClassName='w-full h-full object-cover rounded-full shrink-0'
                            imageContainerClassName='relative group bg-cover bg-center -ml-2 h-[80px] w-[80px] shrink-0'
                            imageURL={userData.profile_image}
                            pintura={
                                {
                                    isEnabled: pinturaEnabled,
                                    openEditor: async () => editor.openEditor({
                                        image: userData.profile_image || '',
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
                        <div>
                            <Heading styles='text-white'>{user.name}{suspendedText}</Heading>
                            <span className='text-md font-semibold capitalize text-white'>{user.roles[0].name.toLowerCase()}</span>
                        </div>
                    </div>
                </div>
                <div className={`${!canAccessSettings(currentUser) && 'mx-auto max-w-4xl'} mt-10 grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2`}>
                    <Basic errors={errors} setUserData={setUserData} user={userData} validators={validators} />
                    <div className='flex flex-col justify-between gap-10'>
                        <Details errors={errors} setUserData={setUserData} user={userData} validators={validators} />
                        <StaffToken user={userData} />
                    </div>
                    <EmailNotifications setUserData={setUserData} user={userData} />
                    <ChangePasswordForm user={userData} />
                </div>
            </div>
        </Modal>
    );
};

const UserDetailModal: React.FC<RoutingModalProps> = ({params}) => {
    const {users} = useStaffUsers();
    const user = users.find(({slug}) => slug === params?.slug);

    if (user) {
        return <UserDetailModalContent user={user} />;
    } else {
        return null;
    }
};

export default NiceModal.create(UserDetailModal);
