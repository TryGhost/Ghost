import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, LucideIcon, Skeleton} from '@tryghost/shade';
import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {ComponentPropsWithoutRef, ReactNode} from 'react';
import {useAccountForUser, useNoteMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useFeatureFlags} from '@src/lib/feature-flags';

interface NewNoteModalProps extends ComponentPropsWithoutRef<typeof Dialog> {
    children?: ReactNode;
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({children, ...props}) => {
    const {isEnabled} = useFeatureFlags();
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index', user);
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');
    const [isOpen, setIsOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState('');
    const navigate = useNavigate();

    const isDisabled = !content.trim() || !user;

    const handlePost = async () => {
        const trimmedContent = content.trim();

        if (!trimmedContent || !user) {
            return;
        }

        try {
            await noteMutation.mutateAsync(trimmedContent);
            navigate('/feed');
            setIsOpen(false);
        } catch (error) {
            // Handle error case if needed
            // console.error('Failed to create post:', error);
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

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const file = files[0];

            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            // the upload logic here
            // const uploadedUrl = await handleImageUpload(file);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);

        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (open) {
                setContent('');
            }
            setIsOpen(open);
        }} {...props}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className='min-h-[200px]'>
                <DialogHeader className='hidden'>
                    <DialogTitle>New note</DialogTitle>
                    <DialogDescription>Post your thoughts to the Social web</DialogDescription>
                </DialogHeader>
                <div className='flex items-start gap-3'>
                    <APAvatar author={user as ActorProperties} />
                    <FormPrimitive.Root asChild>
                        <div className='-mt-0.5 flex w-full flex-col gap-0.5'>
                            {isLoadingAccount ?
                                <Skeleton className='w-10' /> :
                                <span className='text-lg font-semibold'>{account?.name}</span>
                            }
                            <FormPrimitive.Field name='content' asChild>
                                <FormPrimitive.Control asChild>
                                    <textarea
                                        ref={textareaRef}
                                        autoFocus={true}
                                        className='ap-textarea w-full resize-none bg-transparent text-[1.5rem]'
                                        placeholder='What&apos;s new?'
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
                    <div className='group relative w-fit grow'>
                        <img className='max-h-[420px] rounded-sm outline outline-1 -outline-offset-1 outline-black/10' src={imagePreview} />
                        <Button className='absolute right-3 top-3 size-8 bg-black/60 opacity-0 hover:bg-black/80 group-hover:opacity-100' onClick={handleClearImage}><LucideIcon.Trash2 /></Button>
                    </div>
                }
                <DialogFooter>
                    {isEnabled('note-image') &&
                        <Button className='mr-auto w-[34px] !min-w-0' variant='outline' onClick={() => imageInputRef.current?.click()}><LucideIcon.Image /></Button>
                    }
                    <DialogClose>
                        <Button className='min-w-16' variant='outline'>Cancel</Button>
                    </DialogClose>
                    <Button className='min-w-16' disabled={isDisabled} onClick={handlePost}>Post</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewNoteModal;
