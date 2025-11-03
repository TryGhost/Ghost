import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import FeedItem from '@components/feed/FeedItem';
import getUsername from '@utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, LoadingIndicator, LucideIcon, Skeleton} from '@tryghost/shade';
import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {ComponentPropsWithoutRef, ReactNode} from 'react';
import {FILE_SIZE_ERROR_MESSAGE, MAX_FILE_SIZE} from '@utils/image';
import {toast} from 'sonner';
import {uploadFile, useAccountForUser, useNoteMutationForUser, useReplyMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

interface NewNoteModalProps extends ComponentPropsWithoutRef<typeof Dialog> {
    children?: ReactNode;
    replyTo?: {
        object: ObjectProperties;
        actor: ActorProperties;
    };
    onReply?: () => void;
    onReplyError?: () => void;
    onOpenChange?: (open: boolean) => void;
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({children, replyTo, onReply, onReplyError, onOpenChange, ...props}) => {
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index', user);
    const replyMutation = useReplyMutationForUser('index', user);
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');
    const [isOpen, setIsOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const altTextInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [altText, setAltText] = useState('');
    const [showAltInput, setShowAltInput] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const navigate = useNavigateWithBasePath();

    const MAX_CONTENT_LENGTH = 500;

    // Sync external open prop with internal state
    useEffect(() => {
        if (props.open !== undefined) {
            setIsOpen(props.open);
        }
    }, [props.open]);

    useEffect(() => {
        const modalIsOpen = props.open !== undefined ? props.open : isOpen;
        if (modalIsOpen) {
            const timer = setTimeout(() => {
                setIsSticky(true);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setIsSticky(false);
        }
    }, [isOpen, props.open]);

    const isDisabled = !content.trim() || !user || isPosting || content.length > MAX_CONTENT_LENGTH;

    const handlePost = useCallback(async () => {
        const trimmedContent = content.trim();

        if (!trimmedContent || !user) {
            return;
        }

        try {
            setIsPosting(true);

            if (replyTo) {
                await replyMutation.mutateAsync({
                    inReplyTo: replyTo.object.id,
                    content: trimmedContent,
                    imageUrl: uploadedImageUrl || undefined,
                    altText: altText || undefined
                });
                onReply?.();
            } else {
                await noteMutation.mutateAsync({content: trimmedContent, imageUrl: uploadedImageUrl || undefined, altText: altText || undefined});
                navigate('/notes');
            }

            setIsOpen(false);
            if (onOpenChange) {
                onOpenChange(false);
            }
            toast.success(replyTo ? 'Reply posted' : 'Note posted');
        } catch (error) {
            if (replyTo) {
                onReplyError?.();
            }
            // Handle error case if needed
            // console.error('Failed to create post:', error);
        } finally {
            setIsPosting(false);
        }
    }, [content, user, replyTo, replyMutation, noteMutation, uploadedImageUrl, altText, onReply, onReplyError, setIsOpen, navigate, onOpenChange]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [content]);

    // Focus textarea when modal opens
    useEffect(() => {
        const modalIsOpen = props.open !== undefined ? props.open : isOpen;
        if (modalIsOpen && textareaRef.current) {
            // Small delay to ensure modal is fully rendered
            const timeoutId = setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, props.open]);

    // Focus alt text input when it becomes visible
    useEffect(() => {
        if (showAltInput && altTextInputRef.current) {
            const timeoutId = setTimeout(() => {
                altTextInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [showAltInput]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isDisabled && !isImageUploading) {
                    handlePost();
                }
            }
        };

        const modalIsOpen = props.open !== undefined ? props.open : isOpen;
        if (modalIsOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, props.open, isDisabled, isImageUploading, handlePost]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent | ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) {
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    if (file.size > MAX_FILE_SIZE) {
                        toast.error(FILE_SIZE_ERROR_MESSAGE);
                        return;
                    }

                    const previewUrl = URL.createObjectURL(file);
                    setImagePreview(previewUrl);
                    await handleImageUpload(file);
                }
                break;
            }
        }
    }, []);

    useEffect(() => {
        const modalIsOpen = props.open !== undefined ? props.open : isOpen;
        if (modalIsOpen) {
            document.addEventListener('paste', handlePaste);
            return () => document.removeEventListener('paste', handlePaste);
        }
    }, [isOpen, props.open, handlePaste]);

    const handleImageUpload = async (file: File) => {
        try {
            setIsImageUploading(true);
            const imageUrl = await uploadFile(file);
            setUploadedImageUrl(imageUrl);
        } catch (error) {
            setImagePreview(null);

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
            setIsImageUploading(false);
        }
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const file = files[0];

            if (file.size > MAX_FILE_SIZE) {
                toast.error(FILE_SIZE_ERROR_MESSAGE);
                e.target.value = '';
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            await handleImageUpload(file);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);
        setUploadedImageUrl(null);
        setAltText('');
        setShowAltInput(false);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    const handleToggleAltInput = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAltInput(!showAltInput);
    };

    const handleContentClick = () => {
        textareaRef.current?.focus();
    };

    useEffect(() => {
        // Cleanup function to revoke object URLs when component unmounts
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    let placeholder = 'What\'s new?';
    if (replyTo) {
        const attributedTo = replyTo.object.attributedTo || {};
        if (typeof attributedTo === 'object' && 'preferredUsername' in attributedTo && 'id' in attributedTo) {
            placeholder = `Reply to ${getUsername(attributedTo as ActorProperties)}...`;
        }
    }

    return (
        <Dialog open={props.open !== undefined ? props.open : isOpen} onOpenChange={(open) => {
            if (open) {
                setContent('');
                setImagePreview(null);
                setUploadedImageUrl(null);
                setAltText('');
                setShowAltInput(false);
                if (imagePreview) {
                    URL.revokeObjectURL(imagePreview);
                }
                if (imageInputRef.current) {
                    imageInputRef.current.value = '';
                }
            }

            setIsOpen(open);

            if (onOpenChange) {
                onOpenChange(open);
            }
        }} {...(props.open !== undefined ? {} : props)}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className={`max-h-[80vh] min-h-[240px] gap-0 overflow-y-auto pb-0`} data-testid="new-note-modal" onClick={e => e.stopPropagation()}>
                <DialogHeader className='hidden'>
                    <DialogTitle>{replyTo ? 'Reply' : 'New note'}</DialogTitle>
                    <DialogDescription>Post your thoughts to the Social web</DialogDescription>
                </DialogHeader>
                {replyTo && (
                    <FeedItem
                        actor={replyTo.actor}
                        allowDelete={false}
                        commentCount={replyTo.object.replyCount ?? 0}
                        isCompact={true}
                        layout='reply'
                        likeCount={replyTo.object.likeCount ?? 0}
                        object={replyTo.object}
                        repostCount={replyTo.object.repostCount ?? 0}
                        type={replyTo.object.type === 'Article' ? 'Article' : 'Note'}
                        onClick={() => {}}
                    />
                )}
                <div className={`flex ${!imagePreview ? 'min-h-36' : ''} cursor-text items-start gap-3`} onClick={handleContentClick}>
                    <div className='sticky top-0'>
                        <APAvatar author={user as ActorProperties} />
                    </div>
                    <FormPrimitive.Root asChild>
                        <div className='-mt-0.5 flex w-full flex-col gap-0.5'>
                            {isLoadingAccount ?
                                <Skeleton className='w-10' /> :
                                <span className='min-w-0 truncate whitespace-nowrap font-semibold text-black break-anywhere dark:text-white'>{account?.name}</span>
                            }
                            <FormPrimitive.Field name='content' asChild>
                                <FormPrimitive.Control asChild>
                                    <textarea
                                        ref={textareaRef}
                                        autoFocus={true}
                                        className='ap-textarea w-full resize-none bg-transparent text-[1.5rem] break-anywhere'
                                        data-testid="note-textarea"
                                        placeholder={placeholder}
                                        rows={1}
                                        value={content}
                                        onChange={handleChange}
                                        onPaste={handlePaste}
                                    />
                                </FormPrimitive.Control>
                            </FormPrimitive.Field>
                            <FormPrimitive.Field name='image' asChild>
                                <FormPrimitive.Control asChild>
                                    <input
                                        ref={imageInputRef}
                                        accept="image/jpeg,image/png,image/webp"
                                        className='hidden'
                                        type="file"
                                        onChange={handleImageChange}
                                    />
                                </FormPrimitive.Control>
                            </FormPrimitive.Field>
                        </div>
                    </FormPrimitive.Root>
                </div>
                {imagePreview &&
                    <div className='group relative mt-6 flex min-h-[200px] w-full items-center justify-center'>
                        <img alt='Image attachment preview' className={`max-h-[320px] w-full rounded-sm object-cover outline outline-1 -outline-offset-1 outline-black/10 ${isImageUploading && 'opacity-10'}`} src={imagePreview} />
                        {isImageUploading &&
                            <div className='absolute leading-[0]'>
                                <LoadingIndicator size='md' />
                            </div>
                        }
                        <Button className='absolute right-3 top-3 size-8 bg-black/60 text-white opacity-0 hover:bg-black/80 group-hover:opacity-100' onClick={handleClearImage}><LucideIcon.Trash2 /></Button>
                        {!isImageUploading && <Button className={`absolute bottom-3 left-3 h-6 px-2 py-0 text-white ${!showAltInput ? 'bg-black/60 hover:bg-black/80' : 'bg-green-500 hover:bg-green-500'}`} onClick={handleToggleAltInput}>Alt</Button>}
                    </div>
                }
                {imagePreview && !isImageUploading && showAltInput &&
                    <div className='mt-1'>
                        <Input
                            ref={altTextInputRef}
                            className='w-full border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-0 dark:bg-[#101114] dark:text-white dark:placeholder:text-gray-800'
                            placeholder='Type alt text for image (optional)'
                            type='text'
                            value={altText}
                            onChange={e => setAltText(e.target.value)}
                        />
                    </div>
                }
                <DialogFooter className={`${isSticky ? 'sticky' : 'static'} bottom-0 flex-row bg-background py-6 dark:bg-[#101114]`}>
                    <Button className='mr-auto w-[34px] !min-w-0' variant='outline' onClick={() => imageInputRef.current?.click()}><LucideIcon.Image /></Button>
                    <div className='flex items-center space-x-3'>
                        <div className={`text-sm ${content.length >= MAX_CONTENT_LENGTH ? 'text-red-500' : content.length >= MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            {content.length}/{MAX_CONTENT_LENGTH}
                        </div>
                        <Button className='min-w-16' data-testid="post-button" disabled={isDisabled || isImageUploading} onClick={handlePost}>
                            {isPosting ? <LoadingIndicator color='light' size='sm' /> : 'Post'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewNoteModal;
