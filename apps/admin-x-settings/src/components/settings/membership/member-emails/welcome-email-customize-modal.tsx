import DesignSettingsForm from '../../email-design/design-settings-form';
import EmailDesignModal from '../../email-design/email-design-modal';
import EmailPreview from '../../email-design/email-preview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {DEFAULT_EMAIL_DESIGN, type EmailDesignSettings} from '../../email-design/types';
import {useCallback, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {siteData} = useGlobalData();
    const [settings, setSettings] = useState<EmailDesignSettings>({...DEFAULT_EMAIL_DESIGN});

    const handleSettingsChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleSave = useCallback(() => {
        // TODO: persist to backend when design columns are added
        modal.remove();
    }, [modal]);

    const handleClose = useCallback(() => {
        modal.remove();
    }, [modal]);

    return (
        <EmailDesignModal
            preview={<EmailPreview settings={settings} />}
            sidebar={
                <DesignSettingsForm
                    accentColor={siteData.accent_color}
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                />
            }
            testId="welcome-email-customize-modal"
            title="Customize welcome emails"
            onClose={handleClose}
            onSave={handleSave}
        />
    );
});

export default WelcomeEmailCustomizeModal;
