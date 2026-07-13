import NiceModal from '@ebay/nice-modal-react';
import PaywallDetailModal from './paywalls/paywall-detail-modal';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {type PaywallConfig, loadConfig, saveConfig} from './paywalls/paywalls-data';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

const Paywalls: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings, siteData} = useGlobalData();
    const [accentColor, title] = getSettingValues<string>(settings, ['accent_color', 'title']);
    const [config, setConfig] = useState<PaywallConfig>(() => loadConfig());

    const handleSave = (updated: PaywallConfig) => {
        setConfig(updated);
        saveConfig(updated);
    };

    const openEditModal = () => {
        NiceModal.show(PaywallDetailModal, {
            config,
            accentColor: accentColor || siteData?.accent_color || '#ff1a75',
            siteTitle: title || 'Your site',
            onSave: handleSave
        });
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Edit' size='sm' onClick={openEditModal}/>}
            description='Customize the calls-to-action shown when readers reach content that requires a subscription, on your site and in emails.'
            keywords={keywords}
            navid='paywalls'
            testId='paywalls'
            title='Paywalls'
        />
    );
};

export default withErrorBoundary(Paywalls, 'Paywalls');
