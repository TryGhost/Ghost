import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '../global/APAvatar';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Modal, showToast} from '@tryghost/admin-x-design-system';
import {useCallback, useMemo, useState} from 'react';
import {useNoteMutationForUser, useUserDataForUser} from '../../hooks/useActivityPubQueries';

const NewPostModal = NiceModal.create(() => {
    const modal = useModal();
    const {data: user} = useUserDataForUser('index');
    const [content, setContent] = useState('');
    const noteMutation = useNoteMutationForUser('index');

    const isDisabled = useMemo(() => {
        return noteMutation.isLoading || !content.trim();
    }, [noteMutation.isLoading, content]);

    const handlePost = useCallback(async () => {
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return;
        }

        await noteMutation.mutate({content: trimmedContent}, {
            onSuccess() {
                showToast({
                    message: 'Note posted',
                    type: 'success'
                });
                modal.remove();
            },
            onError() {
                showToast({
                    message: 'An error occurred while posting your note.',
                    type: 'error'
                });
            }
        });
    }, [content, modal, noteMutation]);

    const handleCancel = useCallback(() => {
        modal.remove();
    }, [modal]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    return (
        <Modal
            cancelLabel="Cancel"
            okColor="black"
            okDisabled={isDisabled}
            okLabel="Post"
            size="md"
            stickyFooter={true}
            width={575}
            onCancel={handleCancel}
            onOk={handlePost}
        >
            <div className='flex items-start gap-2'>
                <APAvatar author={user as ActorProperties} />
                <FormPrimitive.Root asChild>
                    <div className='flex w-full flex-col'>
                        <FormPrimitive.Field name='content' asChild>
                            <FormPrimitive.Control asChild>
                                <textarea
                                    autoFocus={true}
                                    className='ap-textarea w-full resize-none p-2 text-[1.5rem]'
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
