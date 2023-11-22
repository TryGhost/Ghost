import NiceModal from '@ebay/nice-modal-react';
import {Heading, Modal} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const DemoModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            cancelLabel=''
            okLabel='Close'
            size='sm'
            title='About'
            onOk={() => {
                updateRoute('');
                modal.remove();
            }}
        >
            <div className='mt-3 flex flex-col gap-4'>
                <p>{`You're looking at a React app inside Ghost Admin. It uses common AdminX framework and Design System packages, and works seamlessly with the current Admin's routing.`}</p>
                <p>{`At the moment the look and feel follows the current Admin's style to blend in with existing pages. However the system is built in a very flexible way to allow easy updates in the future.`}</p>
                <Heading className='-mb-2 mt-4' level={5}>Contents</Heading>
                <p>{`The demo uses a mocked list of members — it's `}<strong>not</strong> {`the actual or future design of members in Ghost Admin. Instead, the pages showcase common design patterns like a list and detail, navigation, modals and toasts.`}</p>
            </div>
        </Modal>
    );
});

export default DemoModal;
