import EmailDesignModal from '../../email-design/email-design-modal';
import EmailPreview from '../../email-design/email-preview';
import HeaderImageField from '../../email-design/header-image-field';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import ShowBadgeField from '../../email-design/show-badge-field';
import WelcomeEmailPreviewContent from '../../email-design/welcome-email-preview-content';
import {
    BackgroundColorField,
    BodyFontField,
    ButtonColorField,
    ButtonCornersField,
    ButtonStyleField,
    DividerColorField,
    HeaderBackgroundField,
    HeadingFontField,
    HeadingWeightField,
    ImageCornersField,
    LinkColorField,
    LinkStyleField
} from '../../email-design/design-fields';
import {DEFAULT_EMAIL_DESIGN, type EmailDesignSettings} from '../../email-design/types';
import {EmailDesignProvider} from '../../email-design/email-design-context';
import {
    Input,
    Separator,
    Switch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Textarea
} from '@tryghost/shade';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';

interface GeneralSettings {
    senderName: string;
    replyToEmail: string;
    headerImage: string;
    showPublicationTitle: boolean;
    showBadge: boolean;
    emailFooter: string;
}

interface GeneralTabProps {
    generalSettings: GeneralSettings;
    onGeneralChange: (updates: Partial<GeneralSettings>) => void;
    siteTitle: string | undefined;
    emailDomain: string;
}

const GeneralTab: React.FC<GeneralTabProps> = ({generalSettings, onGeneralChange, siteTitle, emailDomain}) => (
    <div className="flex flex-col gap-6 pt-6">
        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Email info</h4>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Sender name</label>
                    <Input
                        placeholder={siteTitle || 'Your site name'}
                        value={generalSettings.senderName}
                        onChange={e => onGeneralChange({senderName: e.target.value})}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Reply-to email</label>
                    <Input
                        placeholder={`noreply@${emailDomain}`}
                        value={generalSettings.replyToEmail}
                        onChange={e => onGeneralChange({replyToEmail: e.target.value})}
                    />
                </div>
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Content</h4>
            <div className="flex flex-col gap-4">
                <HeaderImageField
                    value={generalSettings.headerImage}
                    onChange={url => onGeneralChange({headerImage: url})}
                />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Publication title</span>
                    <Switch
                        checked={generalSettings.showPublicationTitle}
                        size='sm'
                        onCheckedChange={checked => onGeneralChange({showPublicationTitle: checked})}
                    />
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Email footer</label>
                    <Textarea
                        placeholder="Any extra information or legal text"
                        rows={3}
                        value={generalSettings.emailFooter}
                        onChange={e => onGeneralChange({emailFooter: e.target.value})}
                    />
                </div>
                <ShowBadgeField
                    value={generalSettings.showBadge}
                    onChange={checked => onGeneralChange({showBadge: checked})}
                />
            </div>
        </section>
    </div>
);

const DesignTab: React.FC = () => (
    <div className="flex flex-col gap-6 pt-6">
        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Global</h4>
            <div className="flex flex-col gap-4">
                <BackgroundColorField />
                <HeadingFontField />
                <HeadingWeightField />
                <BodyFontField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Header</h4>
            <div className="flex flex-col gap-4">
                <HeaderBackgroundField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Body</h4>
            <div className="flex flex-col gap-4">
                <ButtonColorField />
                <ButtonStyleField />
                <ButtonCornersField />
                <LinkColorField />
                <LinkStyleField />
                <ImageCornersField />
                <DividerColorField />
            </div>
        </section>
    </div>
);

interface SidebarProps {
    generalSettings: GeneralSettings;
    onGeneralChange: (updates: Partial<GeneralSettings>) => void;
    siteTitle: string | undefined;
    emailDomain: string;
}

const Sidebar: React.FC<SidebarProps> = ({generalSettings, onGeneralChange, siteTitle, emailDomain}) => (
    <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="general" variant="underline">
        <TabsList className='px-5'>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        <TabsContent className='min-h-0 flex-1 overflow-y-auto px-5 pb-5' value="general">
            <GeneralTab
                emailDomain={emailDomain}
                generalSettings={generalSettings}
                siteTitle={siteTitle}
                onGeneralChange={onGeneralChange}
            />
        </TabsContent>
        <TabsContent className='min-h-0 flex-1 overflow-y-auto px-5 pb-5' value="design">
            <DesignTab />
        </TabsContent>
    </Tabs>
);

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {siteData, settings: globalSettings, config} = useGlobalData();
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(globalSettings, ['title', 'default_email_address', 'support_email_address']);

    const [designSettings, setDesignSettings] = useState<EmailDesignSettings>({...DEFAULT_EMAIL_DESIGN});
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        senderName: siteTitle || '',
        replyToEmail: supportEmailAddress || defaultEmailAddress || '',
        headerImage: '',
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: ''
    });

    const handleDesignChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setDesignSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleGeneralChange = useCallback((updates: Partial<GeneralSettings>) => {
        setGeneralSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleSave = useCallback(() => {
        // TODO: persist to backend when design columns are added
        modal.remove();
    }, [modal]);

    const handleClose = useCallback(() => {
        modal.remove();
    }, [modal]);

    const emailDomain = (config?.emailDomain as string) || defaultEmailAddress?.split('@')[1] || '';

    return (
        <EmailDesignProvider accentColor={siteData.accent_color} settings={designSettings} onSettingsChange={handleDesignChange}>
            <EmailDesignModal
                preview={
                    <EmailPreview
                        emailFooter={generalSettings.emailFooter}
                        footerLinkText="Manage your preferences"
                        headerImage={generalSettings.headerImage}
                        senderEmail={defaultEmailAddress || `noreply@${emailDomain}`}
                        senderName={generalSettings.senderName || siteTitle || 'Your site'}
                        settings={designSettings}
                        showBadge={generalSettings.showBadge}
                        showPublicationTitle={generalSettings.showPublicationTitle}
                        subject={`Welcome to ${generalSettings.senderName || siteTitle || 'our publication'}`}
                    >
                        <WelcomeEmailPreviewContent />
                    </EmailPreview>
                }
                sidebar={
                    <Sidebar
                        emailDomain={emailDomain}
                        generalSettings={generalSettings}
                        siteTitle={siteTitle}
                        onGeneralChange={handleGeneralChange}
                    />
                }
                testId="welcome-email-customize-modal"
                title="Welcome emails"
                onClose={handleClose}
                onSave={handleSave}
            />
        </EmailDesignProvider>
    );
});

export default WelcomeEmailCustomizeModal;
