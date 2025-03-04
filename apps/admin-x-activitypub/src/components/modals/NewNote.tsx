import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Dialog, DialogContent, DialogFooter, DialogTrigger, Skeleton} from '@tryghost/shade';
import {showToast} from '@tryghost/admin-x-design-system';
import {useAccountForUser, useNoteMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

interface NewNoteProps {
    children: React.ReactNode;
};

const NewNote: React.FC<NewNoteProps> = ({children}) => {
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index');
    const {updateRoute} = useRouting();
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index');

    const [content, setContent] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const isDisabled = noteMutation.isLoading || !content.trim();

    const handlePost = async () => {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return;
        }

        noteMutation.mutate({content: trimmedContent}, {
            onSuccess() {
                showToast({
                    message: 'Note posted',
                    type: 'success'
                });

                updateRoute('feed');
                setIsOpen(false);
                setContent('');
            },
            onError(error) {
                showToast({
                    message: 'An error occurred while posting your note.',
                    type: 'error'
                });

                // eslint-disable-next-line no-console
                console.error(error);
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className='w-full max-w-[600px]'>
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
                                        disabled={noteMutation.isLoading}
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
                    <Button className='w-18' type="submit" variant="outline" onClick={() => {
                        setIsOpen(false);
                    }}>Cancel</Button>
                    <Button className='w-18' disabled={isDisabled} type="submit" onClick={() => {
                        handlePost();
                    }}>Post</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewNote;
