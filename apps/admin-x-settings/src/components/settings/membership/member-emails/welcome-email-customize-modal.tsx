import EmailDesignModal from '../../email-design/email-design-modal';
import EmailPreview from '../../email-design/email-preview';
import HeaderImageField from '../../email-design/header-image-field';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import ShowBadgeField from '../../email-design/show-badge-field';
import WelcomeEmailPreviewContent from '../../email-design/welcome-email-preview-content';
import {type AutomatedEmailDesign, useEditAutomatedEmailDesign, useReadAutomatedEmailDesign} from '@tryghost/admin-x-framework/api/automated-email-design';
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
import {DEFAULT_EMAIL_DESIGN, type EmailDesignSettings, type PersistedEmailDesignSettings} from '../../email-design/types';
import {EmailDesignProvider} from '../../email-design/email-design-context';
import {Input, LoadingIndicator, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea} from '@tryghost/shade/components';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {showToast} from '@tryghost/admin-x-design-system';
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
            <h4 className="mb-4 font-semibold md:text-lg">Email info</h4>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="welcome-email-sender-name">Sender name</label>
                    <Input
                        id="welcome-email-sender-name"
                        placeholder={siteTitle || 'Your site name'}
                        value={generalSettings.senderName}
                        onChange={e => onGeneralChange({senderName: e.target.value})}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="welcome-email-reply-to-email">Reply-to email</label>
                    <Input
                        id="welcome-email-reply-to-email"
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
                    <label className="text-sm font-medium" htmlFor="welcome-email-footer">Email footer</label>
                    <Textarea
                        id="welcome-email-footer"
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
    isLoading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({generalSettings, onGeneralChange, siteTitle, emailDomain, isLoading}) => (
    <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="general" variant="underline">
        <TabsList className='px-5'>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
                <LoadingIndicator size="md" />
            </div>
        ) : (
            <>
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
            </>
        )}
    </Tabs>
);

/**
 * Maps API response fields to the frontend GeneralSettings shape.
 *
 * @param {import('@tryghost/admin-x-framework/api/automated-email-design').AutomatedEmailDesign} apiData - The design record from the API
 * @param {GeneralSettings} defaults - Fallback values for sender fields not in the design endpoint
 * @returns {GeneralSettings} General settings populated from the API response
 */
function mapApiToGeneralSettings(
    apiData: Pick<AutomatedEmailDesign, 'header_image' | 'show_header_title' | 'show_badge' | 'footer_content'>,
    defaults: GeneralSettings
): GeneralSettings {
    return {
        senderName: defaults.senderName,
        replyToEmail: defaults.replyToEmail,
        headerImage: apiData.header_image || '',
        showPublicationTitle: apiData.show_header_title,
        showBadge: apiData.show_badge,
        emailFooter: apiData.footer_content || ''
    };
}

/**
 * Maps API response fields to the frontend EmailDesignSettings shape.
 *
 * @param {import('@tryghost/admin-x-framework/api/automated-email-design').AutomatedEmailDesign} apiData - The design record from the API
 * @returns {EmailDesignSettings} Design settings populated from the API response
 */
function mapApiToDesignSettings(
    apiData: PersistedEmailDesignSettings
): EmailDesignSettings {
    return {
        background_color: apiData.background_color,
        header_background_color: apiData.header_background_color,
        title_font_category: apiData.title_font_category,
        title_font_weight: apiData.title_font_weight,
        body_font_category: apiData.body_font_category,
        button_color: apiData.button_color,
        button_style: apiData.button_style,
        button_corners: apiData.button_corners,
        link_color: apiData.link_color,
        link_style: apiData.link_style,
        image_corners: apiData.image_corners,
        divider_color: apiData.divider_color,
        section_title_color: apiData.section_title_color,
        // Local-only fields not stored in the backend
        post_title_color: DEFAULT_EMAIL_DESIGN.post_title_color,
        title_alignment: DEFAULT_EMAIL_DESIGN.title_alignment
    };
}

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {siteData, settings: globalSettings, config} = useGlobalData();
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(globalSettings, ['title', 'default_email_address', 'support_email_address']);

    const {data: designData, isLoading} = useReadAutomatedEmailDesign();
    const {mutateAsync: editDesign, isLoading: isSaving} = useEditAutomatedEmailDesign();

    const [designSettings, setDesignSettings] = useState<EmailDesignSettings>({...DEFAULT_EMAIL_DESIGN});
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        senderName: siteTitle || '',
        replyToEmail: supportEmailAddress || defaultEmailAddress || '',
        headerImage: '',
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: ''
    });
    const [hydratedDesignVersion, setHydratedDesignVersion] = useState<string | null>(null);
    const design = designData?.automated_email_design?.[0];
    const designVersion = design ? `${design.id}:${design.updated_at ?? 'initial'}` : null;

    // Populate state from API response once data is available
    useEffect(() => {
        if (design && designVersion !== hydratedDesignVersion) {
            setDesignSettings(mapApiToDesignSettings(design));
            setGeneralSettings(prev => mapApiToGeneralSettings(design, prev));
            setHydratedDesignVersion(designVersion);
        }
    }, [design, designVersion, hydratedDesignVersion]);

    const handleDesignChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setDesignSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleGeneralChange = useCallback((updates: Partial<GeneralSettings>) => {
        setGeneralSettings(prev => ({...prev, ...updates}));
    }, []);

    const handleSave = useCallback(async () => {
        if (!design) {
            showToast({type: 'error', title: 'Unable to load email design settings'});
            return;
        }

        try {
            await editDesign({
                id: design.id,
                background_color: designSettings.background_color,
                header_background_color: designSettings.header_background_color,
                title_font_category: designSettings.title_font_category,
                title_font_weight: designSettings.title_font_weight,
                body_font_category: designSettings.body_font_category,
                button_color: designSettings.button_color,
                button_style: designSettings.button_style,
                button_corners: designSettings.button_corners,
                link_color: designSettings.link_color,
                link_style: designSettings.link_style,
                image_corners: designSettings.image_corners,
                divider_color: designSettings.divider_color,
                section_title_color: designSettings.section_title_color,
                header_image: generalSettings.headerImage || null,
                show_header_title: generalSettings.showPublicationTitle,
                show_badge: generalSettings.showBadge,
                footer_content: generalSettings.emailFooter || null
            });
            await modal.hide();
        } catch {
            showToast({type: 'error', title: 'Failed to save email design settings'});
        }
    }, [design, designSettings, generalSettings, editDesign, modal]);

    const handleClose = useCallback(() => {
        void modal.hide();
    }, [modal]);

    const emailDomain = (config?.emailDomain as string) || defaultEmailAddress?.split('@')[1] || '';

    return (
        <EmailDesignProvider accentColor={siteData.accent_color} settings={designSettings} onSettingsChange={handleDesignChange}>
            <EmailDesignModal
                afterClose={() => {
                    modal.resolveHide();
                    modal.remove();
                }}
                isLoading={isLoading}
                isSaving={isSaving}
                open={modal.visible}
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
                        isLoading={isLoading}
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
