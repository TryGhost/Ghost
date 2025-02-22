import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '@components/global/APAvatar';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Modal, showToast} from '@tryghost/admin-x-design-system';
import {Skeleton} from '@tryghost/shade';
import {useAccountForUser, useNoteMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

const NewPostModal = NiceModal.create(() => {
    const modal = useModal();
    const {data: user} = useUserDataForUser('index');
    const noteMutation = useNoteMutationForUser('index');
    const {updateRoute} = useRouting();
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index');

    const [content, setContent] = useState('');

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
                modal.remove();
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

    const handleCancel = () => {
        modal.remove();
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    return (
        <Modal
            cancelLabel=""
            okColor="black"
            okDisabled={isDisabled}
            okLabel="Post"
            size="md"
            stickyFooter={true}
            topRightContent="close"
            width={660}
            onCancel={handleCancel}
            onOk={handlePost}
        >
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
        </Modal>
    );
});

export default NewPostModal;
