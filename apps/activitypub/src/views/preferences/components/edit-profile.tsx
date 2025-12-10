import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {Account} from '@src/api/activitypub';
import {Button, DialogClose, DialogFooter, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, LoadingIndicator, LucideIcon, Textarea} from '@tryghost/shade';
import {FILE_SIZE_ERROR_MESSAGE, MAX_FILE_SIZE, SQUARE_IMAGE_ERROR_MESSAGE, isSquareImage} from '@utils/image';
import {toast} from 'sonner';
import {uploadFile} from '@hooks/use-activity-pub-queries';
import {useForm} from 'react-hook-form';
import {useUpdateAccountMutationForUser} from '@hooks/use-activity-pub-queries';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';

const decodeHTMLEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const FormSchema = z.object({
    profileImage: z.string().optional(),
    coverImage: z.string().optional(),
    name: z.string()
        .nonempty({
            message: 'Display name is required.'
        })
        .max(64, {
            message: 'Display name must be less than 64 characters.'
        }),
    handle: z.string()
        .min(2, {
            message: 'Handle must be at least 2 characters.'
        })
        .max(100, {
            message: 'Handle must be less than 100 characters.'
        })
        .regex(/^[a-zA-Z0-9_]+$/, {
            message: 'Handle must contain only letters, numbers, and underscores.'
        }),
    bio: z.string()
        .max(250, {
            message: 'Bio must be less than 250 characters.'
        })
        .optional()
});

type EditProfileProps = {
    account: Account,
    setIsEditingProfile: (value: boolean) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({account, setIsEditingProfile}) => {
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(account.avatarUrl || null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const [isProfileImageUploading, setIsProfileImageUploading] = useState(false);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(account.bannerImageUrl || null);
    const coverImageInputRef = useRef<HTMLInputElement>(null);
    const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
    const [handleDomain, setHandleDomain] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {mutate: updateAccount} = useUpdateAccountMutationForUser(account?.handle || '');

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            profileImage: account.avatarUrl,
            coverImage: account.bannerImageUrl || '',
            name: account.name,
            handle: '',
            bio: account.bio ? decodeHTMLEntities(account.bio) : ''
        }
    });

    const hasNameError = !!form.formState.errors.name;
    const hasHandleError = !!form.formState.errors.handle;

    useEffect(() => {
        if (account.handle) {
            const match = account.handle.match(/@([^@]+)@(.+)/);
            if (match) {
                form.setValue('handle', match[1]);
                setHandleDomain(match[2]);
            }
        }
    }, [account.handle, form]);

    const triggerProfileImageInput = () => {
        profileImageInputRef.current?.click();
    };

    const handleProfileImageUpload = async (file: File) => {
        try {
            setIsProfileImageUploading(true);
            const uploadedImageUrl = await uploadFile(file);
            return uploadedImageUrl;
        } catch (error) {
            setProfileImagePreview(null);
            form.setValue('profileImage', '');

            let errorMessage = 'Failed to upload image. Try again.';

            if (error && typeof error === 'object' && 'statusCode' in error) {
                switch (error.statusCode) {
                case 413:
                    errorMessage = 'Image size exceeds limit.';
                    break;
                case 415:
                    errorMessage = 'The file type is not supported.';
                    break;
                default:
                    // Use the default error message
                }
            }
            toast.error(errorMessage);
        } finally {
            setIsProfileImageUploading(false);
        }
    };

    const handleProfileImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const file = files[0];

            if (file.size > MAX_FILE_SIZE) {
                toast.error(FILE_SIZE_ERROR_MESSAGE);
                e.target.value = '';
                return;
            }

            const isSquare = await isSquareImage(file);
            if (!isSquare) {
                toast.error(SQUARE_IMAGE_ERROR_MESSAGE);
                e.target.value = '';
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setProfileImagePreview(previewUrl);

            const uploadedUrl = await handleProfileImageUpload(file);
            form.setValue('profileImage', uploadedUrl);
        }
    };

    const triggerCoverImageInput = () => {
        coverImageInputRef.current?.click();
    };

    const handleCoverImageUpload = async (file: File) => {
        try {
            setIsCoverImageUploading(true);
            const uploadedImageUrl = await uploadFile(file);
            return uploadedImageUrl;
        } catch (error) {
            setCoverImagePreview(null);
            form.setValue('coverImage', '');

            let errorMessage = 'Failed to upload image. Try again.';

            if (error && typeof error === 'object' && 'statusCode' in error) {
                switch (error.statusCode) {
                case 413:
                    errorMessage = 'Image size exceeds limit.';
                    break;
                case 415:
                    errorMessage = 'The file type is not supported.';
                    break;
                default:
                    // Use the default error message
                }
            }
            toast.error(errorMessage);
        } finally {
            setIsCoverImageUploading(false);
        }
    };

    const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const file = files[0];

            if (file.size > MAX_FILE_SIZE) {
                toast.error(FILE_SIZE_ERROR_MESSAGE);
                e.target.value = '';
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setCoverImagePreview(previewUrl);

            const uploadedUrl = await handleCoverImageUpload(file);
            form.setValue('coverImage', uploadedUrl);
        }
    };

    function onSubmit(data: z.infer<typeof FormSchema>) {
        setIsSubmitting(true);

        const decodedBio = account.bio ? decodeHTMLEntities(account.bio) : '';
        if (
            data.name === account.name &&
            data.handle === account.handle.split('@')[1] &&
            data.bio === decodedBio &&
            data.profileImage === account.avatarUrl &&
            data.coverImage === account.bannerImageUrl
        ) {
            setIsSubmitting(false);
            setIsEditingProfile(false);

            return;
        }

        updateAccount({
            name: data.name || account.name,
            username: data.handle || account.handle,
            bio: data.bio ?? '',
            avatarUrl: data.profileImage || '',
            bannerImageUrl: data.coverImage || ''
        }, {
            onSettled() {
                setIsSubmitting(false);
                setIsEditingProfile(false);
            }
        });
    }

    return (
        <Form {...form}>
            <form
                className="flex flex-col gap-5"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                    }
                }}
                onSubmit={form.handleSubmit(onSubmit)}
            >

                <div className='relative mb-2'>
                    <div className='group relative flex h-[180px] cursor-pointer items-center justify-center bg-gray-100 dark:bg-gray-950' onClick={triggerCoverImageInput}>
                        {coverImagePreview ?
                            <>
                                <img className={`size-full object-cover ${isCoverImageUploading && 'opacity-10'}`} src={coverImagePreview} />
                                {isCoverImageUploading &&
                                    <div className='absolute leading-[0]'>
                                        <LoadingIndicator size='md' />
                                    </div>
                                }
                                <Button className='absolute right-3 top-3 size-8 bg-black/60 opacity-0 hover:bg-black/80 group-hover:opacity-100 dark:text-white' onClick={(e) => {
                                    e.stopPropagation();
                                    setCoverImagePreview(null);
                                    form.setValue('coverImage', '');
                                }}><LucideIcon.Trash2 /></Button>
                            </> :
                            <Button className='pointer-events-none absolute bottom-3 right-3 bg-gray-250 group-hover:bg-gray-300' variant='secondary'>Upload cover image</Button>
                        }
                    </div>
                    <div className='group absolute -bottom-10 left-4 flex size-20 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:border-[#101114] dark:bg-gray-950' onClick={triggerProfileImageInput}>
                        {profileImagePreview ?
                            <>
                                <img className={`size-full rounded-full object-cover ${isProfileImageUploading && 'opacity-10'}`} src={profileImagePreview} />
                                {isProfileImageUploading &&
                                    <div className='absolute leading-[0]'>
                                        <LoadingIndicator size='md' />
                                    </div>
                                }
                                <Button className='absolute -right-2 -top-2 h-8 w-10 rounded-full bg-black/80 opacity-0 hover:bg-black/90 group-hover:opacity-100 dark:text-white' onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileImagePreview(null);
                                    form.setValue('profileImage', '');
                                }}><LucideIcon.Trash2 /></Button>
                            </> :
                            <LucideIcon.UserRoundPlus size={32} strokeWidth={1.5} />
                        }
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="profileImage"
                    render={() => (
                        <FormItem>
                            <FormControl>
                                <Input
                                    ref={profileImageInputRef}
                                    accept="image/*"
                                    className='hidden'
                                    type="file"
                                    onChange={handleProfileImageChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="coverImage"
                    render={() => (
                        <FormItem>
                            <FormControl>
                                <Input
                                    ref={coverImageInputRef}
                                    accept="image/*"
                                    className='hidden'
                                    type="file"
                                    onChange={handleCoverImageChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Display name</FormLabel>
                            <FormControl>
                                <Input placeholder="Jamie Larson" {...field} />
                            </FormControl>
                            {!hasNameError && (
                                <FormDescription>
                                    The name shown to your followers in the Inbox and Feed
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="handle"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Handle</FormLabel>
                            <FormControl>
                                <div className='relative flex items-center justify-stretch gap-1 rounded-md border border-transparent bg-gray-150 px-3 transition-colors focus-within:border-green focus-within:bg-transparent focus-within:shadow-[0_0_0_2px_rgba(48,207,67,.25)] focus-within:outline-none dark:bg-gray-900'>
                                    <LucideIcon.AtSign className='w-4 min-w-4 text-gray-700' size={16} />
                                    <Input className='w-auto grow !border-none bg-transparent px-0 !shadow-none !outline-none' placeholder="index" {...field} />
                                    <span className='max-w-[200px] truncate whitespace-nowrap text-right text-gray-700 max-sm:hidden' title={`@${handleDomain}`}>@{handleDomain}</span>
                                </div>
                            </FormControl>
                            {!hasHandleError && (
                                <FormDescription>
                                    Your social web handle that others can follow. Works just like an email address. <a className='font-medium text-purple' href="https://ghost.org/help/social-web/" rel="noreferrer" target='_blank'>Learn more</a>
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="bio"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className='max-sm:gap-2'>
                    <DialogClose asChild>
                        <Button variant='outline'>Cancel</Button>
                    </DialogClose>
                    <Button disabled={isSubmitting || isProfileImageUploading || isCoverImageUploading} type="submit">Save</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

export default EditProfile;
