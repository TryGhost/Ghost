import EmailDesignModal from '../../email-design/email-design-modal';
import EmailPreview from '../../email-design/email-preview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
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
    LinkStyleField,
    SectionTitleColorField
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
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Email info</h4>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm">Sender name</label>
                    <Input
                        placeholder={siteTitle || 'Your site name'}
                        value={generalSettings.senderName}
                        onChange={e => onGeneralChange({senderName: e.target.value})}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm">Reply-to email</label>
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
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Content</h4>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm">Header image</label>
                    {generalSettings.headerImage ? (
                        <div className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
                            <img
                                alt="Header"
                                className="h-auto w-full"
                                src={generalSettings.headerImage}
                            />
                            <button
                                className="absolute right-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
                                type="button"
                                onClick={() => onGeneralChange({headerImage: ''})}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-700">
                            630x140 recommended. Use a transparent PNG for best results on any background.
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm">Publication title</span>
                    <Switch
                        checked={generalSettings.showPublicationTitle}
                        onCheckedChange={checked => onGeneralChange({showPublicationTitle: checked})}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm">Email footer</label>
                    <Textarea
                        placeholder="Any extra information or legal text"
                        rows={3}
                        value={generalSettings.emailFooter}
                        onChange={e => onGeneralChange({emailFooter: e.target.value})}
                    />
                </div>
            </div>
        </section>
    </div>
);

const DesignTab: React.FC = () => (
    <div className="flex flex-col gap-6 pt-6">
        <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</h4>
            <div className="flex flex-col gap-4">
                <BackgroundColorField />
                <HeadingFontField />
                <HeadingWeightField />
                <BodyFontField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Header</h4>
            <div className="flex flex-col gap-4">
                <HeaderBackgroundField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Body</h4>
            <div className="flex flex-col gap-4">
                <SectionTitleColorField />
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
    <Tabs defaultValue="general" variant="underline">
        <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
            <GeneralTab
                emailDomain={emailDomain}
                generalSettings={generalSettings}
                siteTitle={siteTitle}
                onGeneralChange={onGeneralChange}
            />
        </TabsContent>
        <TabsContent value="design">
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

    const emailDomain = config?.emailDomain || defaultEmailAddress?.split('@')[1] || '';

    return (
        <EmailDesignProvider accentColor={siteData.accent_color} settings={designSettings} onSettingsChange={handleDesignChange}>
            <EmailDesignModal
                preview={
                    <EmailPreview
                        emailFooter={generalSettings.emailFooter}
                        headerImage={generalSettings.headerImage}
                        senderEmail={defaultEmailAddress || `noreply@${emailDomain}`}
                        senderName={generalSettings.senderName || siteTitle || 'Your site'}
                        settings={designSettings}
                        showPublicationTitle={generalSettings.showPublicationTitle}
                        subject={`Welcome to ${generalSettings.senderName || siteTitle || 'our publication'}`}
                    />
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
