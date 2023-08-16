import APIKeys from './APIKeys';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as Icon} from '../../../../assets/icons/zapier.svg';
import {getGhostPaths} from '../../../../utils/helpers';
import {useBrowseIntegrations} from '../../../../api/integrations';
import {useEffect} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {config} = useGlobalData();

    const zapierDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;
    const integration = integrations.find(({slug}) => slug === 'zapier');

    useEffect(() => {
        if (zapierDisabled || !integration) {
            updateRoute('integrations');
        }
    }, [zapierDisabled, updateRoute, integration]);

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
                extra={<APIKeys keys={[
                    {label: 'Admin API key', text: integration?.api_keys.find(key => key.type === 'admin')?.secret, onRegenerate: () => {}},
                    {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} />}
                icon={<Icon className='h-14 w-14' />}
                title='Zapier'
            />
            TBD
        </Modal>
    );
});

export default ZapierModal;
