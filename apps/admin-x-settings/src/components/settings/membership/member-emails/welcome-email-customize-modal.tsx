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
import {useBrowseAutomatedEmails, useBulkEditAutomatedEmails} from '@tryghost/admin-x-framework/api/automated-emails';
import {useCallback, useEffect, useState} from 'react';
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
            <h4 className="text-gray-500 mb-4 text-xs font-semibold uppercase tracking-wide">Email info</h4>
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
            <h4 className="text-gray-500 mb-4 text-xs font-semibold uppercase tracking-wide">Content</h4>
            <div className="flex flex-col gap-4">
                <HeaderImageField
                    value={generalSettings.headerImage}
                    onChange={url => onGeneralChange({headerImage: url})}
                />
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
            <h4 className="text-gray-500 mb-4 text-xs font-semibold uppercase tracking-wide">Global</h4>
            <div className="flex flex-col gap-4">
                <BackgroundColorField />
                <HeadingFontField />
                <HeadingWeightField />
                <BodyFontField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="text-gray-500 mb-4 text-xs font-semibold uppercase tracking-wide">Header</h4>
            <div className="flex flex-col gap-4">
                <HeaderBackgroundField />
            </div>
        </section>

        <Separator />

        <section>
            <h4 className="text-gray-500 mb-4 text-xs font-semibold uppercase tracking-wide">Body</h4>
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

    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const firstEmail = automatedEmails[0];

    const {mutateAsync: bulkEdit} = useBulkEditAutomatedEmails();

    const [designSettings, setDesignSettings] = useState<EmailDesignSettings>({...DEFAULT_EMAIL_DESIGN});
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        senderName: siteTitle || '',
        replyToEmail: supportEmailAddress || defaultEmailAddress || '',
        headerImage: '',
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: ''
    });
    const [initialized, setInitialized] = useState(false);

    // Initialize settings from API data once loaded
    useEffect(() => {
        if (firstEmail && !initialized) {
            setDesignSettings({
                background_color: firstEmail.background_color ?? DEFAULT_EMAIL_DESIGN.background_color,
                title_font_category: firstEmail.title_font_category ?? DEFAULT_EMAIL_DESIGN.title_font_category,
                title_font_weight: firstEmail.title_font_weight ?? DEFAULT_EMAIL_DESIGN.title_font_weight,
                body_font_category: firstEmail.body_font_category ?? DEFAULT_EMAIL_DESIGN.body_font_category,
                header_background_color: firstEmail.header_background_color ?? DEFAULT_EMAIL_DESIGN.header_background_color,
                post_title_color: DEFAULT_EMAIL_DESIGN.post_title_color,
                title_alignment: firstEmail.title_alignment ?? DEFAULT_EMAIL_DESIGN.title_alignment,
                section_title_color: firstEmail.section_title_color ?? DEFAULT_EMAIL_DESIGN.section_title_color,
                button_color: firstEmail.button_color ?? DEFAULT_EMAIL_DESIGN.button_color,
                button_style: firstEmail.button_style ?? DEFAULT_EMAIL_DESIGN.button_style,
                button_corners: firstEmail.button_corners ?? DEFAULT_EMAIL_DESIGN.button_corners,
                link_color: firstEmail.link_color ?? DEFAULT_EMAIL_DESIGN.link_color,
                link_style: firstEmail.link_style ?? DEFAULT_EMAIL_DESIGN.link_style,
                image_corners: firstEmail.image_corners ?? DEFAULT_EMAIL_DESIGN.image_corners,
                divider_color: firstEmail.divider_color ?? DEFAULT_EMAIL_DESIGN.divider_color
            });
            setGeneralSettings({
                senderName: firstEmail.sender_name || siteTitle || '',
                replyToEmail: firstEmail.sender_reply_to || supportEmailAddress || defaultEmailAddress || '',
                headerImage: firstEmail.header_image || '',
                showPublicationTitle: firstEmail.show_header_title ?? true,
                showBadge: firstEmail.show_badge ?? true,
                emailFooter: firstEmail.footer_content || ''
            });
            setInitialized(true);
        }
    }, [firstEmail, initialized, siteTitle, supportEmailAddress, defaultEmailAddress]);

    const handleDesignChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setDesignSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleGeneralChange = useCallback((updates: Partial<GeneralSettings>) => {
        setGeneralSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleSave = useCallback(async () => {
        const designPayload = {
            background_color: designSettings.background_color,
            header_background_color: designSettings.header_background_color,
            title_font_category: designSettings.title_font_category,
            title_font_weight: designSettings.title_font_weight,
            body_font_category: designSettings.body_font_category,
            title_alignment: designSettings.title_alignment,
            section_title_color: designSettings.section_title_color,
            button_color: designSettings.button_color,
            button_style: designSettings.button_style,
            button_corners: designSettings.button_corners,
            link_color: designSettings.link_color,
            link_style: designSettings.link_style,
            image_corners: designSettings.image_corners,
            divider_color: designSettings.divider_color,
            header_image: generalSettings.headerImage || null,
            show_header_title: generalSettings.showPublicationTitle,
            show_badge: generalSettings.showBadge,
            footer_content: generalSettings.emailFooter || null
        };

        const emailUpdates = automatedEmails.map(email => ({
            id: email.id,
            ...designPayload
        }));

        if (emailUpdates.length > 0) {
            await bulkEdit(emailUpdates);
        }
        modal.remove();
    }, [modal, designSettings, generalSettings, automatedEmails, bulkEdit]);

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
