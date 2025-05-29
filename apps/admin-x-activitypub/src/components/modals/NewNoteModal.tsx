import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import FeedItem from '@components/feed/FeedItem';
import getUsername from '@utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, LoadingIndicator, LucideIcon, Skeleton} from '@tryghost/shade';
import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {ComponentPropsWithoutRef, ReactNode} from 'react';
import {FILE_SIZE_ERROR_MESSAGE, MAX_FILE_SIZE} from '@utils/image';
import {toast} from 'sonner';
import {uploadFile, useAccountForUser, useNoteMutationForUser, useReplyMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';

interface NewNoteModalProps extends ComponentPropsWithoutRef<typeof Dialog> {
    children?: ReactNode;
    replyTo?: {
        object: ObjectProperties;
        actor: ActorProperties;
    };
    onReply?: () => void;
    onReplyError?: () => void;
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({children, replyTo, onReply, onReplyError, ...props}) => {
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index', user);
    const replyMutation = useReplyMutationForUser('index', user);
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');
    const [isOpen, setIsOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const navigate = useNavigate();

    // Sync external open prop with internal state
    useEffect(() => {
        if (props.open !== undefined) {
            setIsOpen(props.open);
        }
    }, [props.open]);

    const isDisabled = !content.trim() || !user || isPosting;

    const handlePost = async () => {
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
                    imageUrl: uploadedImageUrl || undefined
                });
                onReply?.();
            } else {
                await noteMutation.mutateAsync({content: trimmedContent, imageUrl: uploadedImageUrl || undefined});
                navigate('/feed');
            }

            setIsOpen(false);
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
    };

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
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
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
                if (imagePreview) {
                    URL.revokeObjectURL(imagePreview);
                }
                if (imageInputRef.current) {
                    imageInputRef.current.value = '';
                }
            }

            setIsOpen(open);

            if (props.onOpenChange) {
                props.onOpenChange(open);
            }
        }} {...(props.open !== undefined ? {} : props)}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className={`max-h-[80vh] min-h-[200px] overflow-y-auto pb-0`} onClick={e => e.stopPropagation()}>
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
                        object={replyTo.object}
                        repostCount={replyTo.object.repostCount ?? 0}
                        type={replyTo.object.type === 'Article' ? 'Article' : 'Note'}
                        onClick={() => {}}
                    />
                )}
                <div className='flex min-h-24 items-start gap-3'>
                    <APAvatar author={user as ActorProperties} />
                    <FormPrimitive.Root asChild>
                        <div className='-mt-0.5 flex w-full flex-col gap-0.5'>
                            {isLoadingAccount ?
                                <Skeleton className='w-10' /> :
                                <span className='class="break-anywhere dark:text-white" min-w-0 truncate whitespace-nowrap font-semibold text-black'>{account?.name}</span>
                            }
                            <FormPrimitive.Field name='content' asChild>
                                <FormPrimitive.Control asChild>
                                    <textarea
                                        ref={textareaRef}
                                        autoFocus={true}
                                        className='ap-textarea w-full resize-none bg-transparent text-[1.5rem]'
                                        placeholder={placeholder}
                                        rows={1}
                                        value={content}
                                        onChange={handleChange}
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
                    <div className='group relative flex w-fit grow items-center justify-center'>
                        <img alt='Image attachment preview' className={`max-h-[420px] w-full rounded-sm object-cover outline outline-1 -outline-offset-1 outline-black/10 ${isImageUploading && 'opacity-10'}`} src={imagePreview} />
                        {isImageUploading &&
                            <div className='absolute leading-[0]'>
                                <LoadingIndicator size='md' />
                            </div>
                        }
                        <Button className='absolute right-3 top-3 size-8 bg-black/60 opacity-0 hover:bg-black/80 group-hover:opacity-100' onClick={handleClearImage}><LucideIcon.Trash2 /></Button>
                    </div>
                }
                <DialogFooter className='sticky bottom-0 bg-background py-6 dark:bg-[#101114]'>
                    <Button className='mr-auto w-[34px] !min-w-0' variant='outline' onClick={() => imageInputRef.current?.click()}><LucideIcon.Image /></Button>
                    <DialogClose>
                        <Button className='min-w-16' variant='outline'>Cancel</Button>
                    </DialogClose>
                    <Button className='min-w-16' disabled={isDisabled || isImageUploading} onClick={handlePost}>
                        {isPosting ? <LoadingIndicator color='light' size='sm' /> : 'Post'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewNoteModal;
