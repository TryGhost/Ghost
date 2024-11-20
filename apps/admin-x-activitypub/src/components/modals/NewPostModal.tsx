import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from '../global/APAvatar';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Modal, showToast} from '@tryghost/admin-x-design-system';
import {useUserDataForUser} from '../../hooks/useActivityPubQueries';

const NewPostModal = NiceModal.create(() => {
    const modal = useModal();
    const {data: user} = useUserDataForUser('index');

    return (
        <Modal
            cancelLabel="Cancel"
            okLabel="Post"
            stickyFooter={true}
            width={575}
            onCancel={() => {
                modal.remove();
            }}
            onOk={() => {
                showToast({
                    message: 'Note sent',
                    type: 'success'
                });
                modal.remove();
            }}
        >
            <div className='flex items-start gap-2'>
                <APAvatar author={user as ActorProperties} />
                <FormPrimitive.Root asChild>
                    <div className='flex w-full flex-col'>
                        <FormPrimitive.Field name='temp' asChild>
                            <FormPrimitive.Control asChild>
                                <textarea
                                    autoFocus={true}
                                    className='ap-textarea w-full resize-none p-2 text-lg'
                                    placeholder='What&apos;s on your mind?'
                                    rows={1}
                                >
                                </textarea>
                            </FormPrimitive.Control>
                        </FormPrimitive.Field>
                    </div>
                </FormPrimitive.Root>
            </div>
        </Modal>
    );
});

export default NewPostModal;
