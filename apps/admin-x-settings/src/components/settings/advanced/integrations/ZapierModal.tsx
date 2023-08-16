import APIKeys from './APIKeys';
import Button from '../../../../admin-x-ds/global/Button';
import IntegrationHeader from './IntegrationHeader';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as ArrowRightIcon} from '../../../../admin-x-ds/assets/icons/arrow-right.svg';
import {ReactComponent as Icon} from '../../../../assets/icons/zapier.svg';
import {getGhostPaths} from '../../../../utils/helpers';
import {useBrowseIntegrations} from '../../../../api/integrations';
import {useEffect} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useServices} from '../../../providers/ServiceProvider';

export interface ZapierTemplate {
    ghostImage: string;
    appImage: string;
    title: string;
    url: string;
}

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {zapierTemplates} = useServices();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {config} = useGlobalData();
    const {adminRoot} = getGhostPaths();

    const zapierDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;
    const integration = integrations.find(({slug}) => slug === 'zapier');

    useEffect(() => {
        if (zapierDisabled) {
            updateRoute('integrations');
        }
    }, [zapierDisabled, updateRoute]);

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

            <List className='mt-6'>
                {zapierTemplates.map(template => (
                    <ListItem
                        action={<Button color='green' href={template.url} label='Use this Zap' tag='a' target='_blank' link />}
                        avatar={<>
                            <img className='h-10 w-10 object-contain' role='presentation' src={`${adminRoot}${template.ghostImage}`} />
                            <ArrowRightIcon className='h-4 w-4' />
                            <img className='h-10 w-10 object-contain' role='presentation' src={`${adminRoot}${template.appImage}`} />
                        </>}
                        bgOnHover={false}
                        className='flex items-center gap-3 py-2'
                        title={template.title}
                    />
                ))}
            </List>
        </Modal>
    );
});

export default ZapierModal;
