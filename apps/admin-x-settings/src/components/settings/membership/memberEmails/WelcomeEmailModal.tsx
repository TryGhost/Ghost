import NiceModal from '@ebay/nice-modal-react';
import {Button, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const WelcomeEmailModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            footer={false}
            header={false}
            testId='welcome-email-modal'
            onCancel={() => {
                modal.remove();
            }}
            onOk={() => {
                modal.remove();
            }}
        >
            <div className='-mx-8 h-[calc(100vh-16vmin)] overflow-y-auto'>
                <div className='sticky top-0 flex flex-col gap-2 border-b border-grey-100 bg-white p-5'>
                    <div className='mb-2 flex items-center justify-between'>
                        <h3 className='font-semibold'>Free members welcome email</h3>
                        <div className='flex items-center gap-2'>
                            <Button
                                className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white'
                                color="clear"
                                icon='send'
                                label="Test"
                            />
                            <Button
                                color="black"
                                label="Save"
                            />
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <div className='w-20 font-semibold'>From:</div>
                        <div>
                            Publisher Weekly
                            <span className='ml-1 text-grey-700'>{`<test@example.com>`}</span>
                        </div>
                    </div>

                    {/* Only display if it's not the same as sender email */}
                    <div className='flex items-center py-1'>
                        <div className='w-20 font-semibold'>Reply-to:</div>
                        <span className='text-grey-700'>hello@example.com</span>
                    </div>

                    <div className='-mt-1 flex items-center'>
                        <div className='w-20 font-semibold'>Subject:</div>
                        <div className='grow'>
                            <TextField className='!h-[34px] w-full' value={'Welcome to Publisher Weekly'}/>
                        </div>
                    </div>
                </div>
                <div className='px-10 py-5 font-serif text-lg [&_a]:underline [&_p]:mb-5'>
                    <p className='font-bold'>Welcome! It’s great to have you here.</p>
                    <p>You’ll start getting updates right in your inbox. You can also log in any time to read the full archive or catch up on new posts as they go live.</p>
                    <p>A quick heads-up:</p>
                    <p>If the newsletter doesn’t show up, check your <i>spam folder</i> folder or your Promotions tab and mark this address as not spam.</p>
                    <p>And remember: everything is always available on <a href="https://example.com">publisherweekly.org</a>.</p>
                    <p>Thanks for joining — feel free to share it with a friend or two if you think they’d enjoy it.</p>
                </div>
            </div>
        </Modal>
    );
});

export default WelcomeEmailModal;
