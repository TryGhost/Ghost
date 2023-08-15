import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import {ReactComponent as Icon} from '../../../../assets/icons/zapier.svg';

const APIKeys: React.FC = () => {
    return (
        <table className='m-0'>
            <tr>
                <td className='p-0 pb-1.5 pr-4 text-grey-600'>Admin API key</td>
                <td className='p-0 pb-1.5'>abcdef123456</td>
            </tr>
            <tr>
                <td className='p-0 pb-1.5 pr-4 text-grey-600'>API URL</td>
                <td className='p-0 pb-1.5'>https://example.com</td>
            </tr>
        </table>
    );
};

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Automation for your favorite apps'
                extra={<APIKeys />}
                icon={<Icon className='h-14 w-14' />}
                title='Zapier'
            />
            TBD
        </Modal>
    );
});

export default ZapierModal;