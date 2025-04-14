import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Skeleton} from '@tryghost/shade';
import {ComponentPropsWithoutRef, ReactNode} from 'react';
import {useAccountForUser, useNoteMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useState} from 'react';

interface NewNoteModalProps extends ComponentPropsWithoutRef<typeof Dialog> {
    children?: ReactNode;
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({children, ...props}) => {
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index', user);
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');
    const [isOpen, setIsOpen] = useState(false);

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
            <DialogContent className='max-w-[640px]'>
                <DialogHeader className='hidden'>
                    <DialogTitle>New note</DialogTitle>
                    <DialogDescription>Post your thoughts to the Social web</DialogDescription>
                </DialogHeader>
                <div className='flex items-start gap-2'>
                    <APAvatar author={user as ActorProperties} />
                    <FormPrimitive.Root asChild>
                        <div className='-mt-0.5 flex w-full flex-col gap-0.5 p-2 pt-0'>
                            {isLoadingAccount ?
                                <Skeleton className='w-10' /> :
                                <span className='font-semibold'>{account?.name}</span>
                            }
                            <FormPrimitive.Field name='content' asChild>
                                <FormPrimitive.Control asChild>
                                    <textarea
                                        autoFocus={true}
                                        className='ap-textarea w-full resize-none bg-transparent text-[1.5rem]'
                                        placeholder='What&apos;s new?'
                                        rows={3}
                                        value={content}
                                        onChange={handleChange}
                                    />
                                </FormPrimitive.Control>
                            </FormPrimitive.Field>
                        </div>
                    </FormPrimitive.Root>
                </div>
                <DialogFooter>
                    <Button className='min-w-16' disabled={isDisabled} onClick={handlePost}>Post</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewNoteModal;
