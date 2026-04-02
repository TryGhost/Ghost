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
    LinkStyleField,
    SectionTitleColorField
} from '../../email-design/design-fields';
import {DEFAULT_EMAIL_DESIGN, type EmailDesignSettings, type PersistedEmailDesignSettings} from '../../email-design/types';
import {EmailDesignProvider} from '../../email-design/email-design-context';
import {Input, LoadingIndicator, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea} from '@tryghost/shade/components';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/global-data-provider';

interface GeneralSettings {
    senderName: string;
    replyToEmail: string;
    headerImage: string;
    showPublicationTitle: boolean;
    showBadge: boolean;
    emailFooter: string;
}

interface WelcomeEmailCustomizeFormState {
    designSettings: EmailDesignSettings;
    generalSettings: GeneralSettings;
}

const SAVE_ERROR_TOAST_ID = 'welcome-email-design-save-error';

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

export const DesignTab: React.FC = () => (
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
    isLoading: boolean;
    errorMessage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({generalSettings, onGeneralChange, siteTitle, emailDomain, isLoading, errorMessage}) => (
    <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="general" variant="underline">
        <TabsList className='px-5'>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
                <LoadingIndicator size="md" />
            </div>
        ) : errorMessage ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-700 dark:text-gray-300">
                {errorMessage}
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
 * Note: senderName and replyToEmail come from site-level settings, not the design endpoint.
 *
 * @param {Pick<AutomatedEmailDesign, 'header_image' | 'show_header_title' | 'show_badge' | 'footer_content'>} apiData - Subset of design fields used for general settings
 * @param {GeneralSettings} defaults - Carries forward senderName and replyToEmail, which are not part of the design API
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
 * @param {PersistedEmailDesignSettings} apiData - The persisted design fields from the API response
 * @returns {EmailDesignSettings} Design settings populated from the API response, with local-only preview fields set to defaults
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

const ErrorState: React.FC<{message: string}> = ({message}) => (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-700 dark:text-gray-300">
        {message}
    </div>
);

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {siteData, settings: globalSettings, config} = useGlobalData();
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(globalSettings, ['title', 'default_email_address', 'support_email_address']);

    const handleError = useHandleError();
    const {data: designData, isLoading, isError} = useReadAutomatedEmailDesign();
    const {mutateAsync: editDesign} = useEditAutomatedEmailDesign();
    const [hasSaveError, setHasSaveError] = useState(false);

    const defaultGeneralSettings = useMemo<GeneralSettings>(() => ({
        senderName: siteTitle || '',
        replyToEmail: supportEmailAddress || defaultEmailAddress || '',
        headerImage: '',
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: ''
    }), [defaultEmailAddress, siteTitle, supportEmailAddress]);
    const {formState, saveState, updateForm, setFormState, handleSave, okProps} = useForm<WelcomeEmailCustomizeFormState>({
        initialState: {
            designSettings: {...DEFAULT_EMAIL_DESIGN},
            generalSettings: defaultGeneralSettings
        },
        savingDelay: 500,
        onSave: async (state) => {
            if (!design) {
                toast.error('Unable to load email design settings. Please try again.', {
                    id: SAVE_ERROR_TOAST_ID
                });
                setHasSaveError(true);
                throw new Error('Unable to load email design settings');
            }

            await editDesign({
                background_color: state.designSettings.background_color,
                header_background_color: state.designSettings.header_background_color,
                title_font_category: state.designSettings.title_font_category,
                title_font_weight: state.designSettings.title_font_weight,
                body_font_category: state.designSettings.body_font_category,
                button_color: state.designSettings.button_color,
                button_style: state.designSettings.button_style,
                button_corners: state.designSettings.button_corners,
                link_color: state.designSettings.link_color,
                link_style: state.designSettings.link_style,
                image_corners: state.designSettings.image_corners,
                divider_color: state.designSettings.divider_color,
                section_title_color: state.designSettings.section_title_color,
                header_image: state.generalSettings.headerImage || null,
                show_header_title: state.generalSettings.showPublicationTitle,
                show_badge: state.generalSettings.showBadge,
                footer_content: state.generalSettings.emailFooter || null
            });
            setHasSaveError(false);
            toast.dismiss(SAVE_ERROR_TOAST_ID);
        },
        onSaveError: (error) => {
            handleError(error, {withToast: false});
            toast.error('Unable to save email design settings. Please try again.', {
                id: SAVE_ERROR_TOAST_ID
            });
            setHasSaveError(true);
        }
    });
    const [hydratedDesignVersion, setHydratedDesignVersion] = useState<string | null>(null);
    const design = designData?.automated_email_design?.[0];
    const designVersion = design ? `${design.id}:${design.updated_at ?? 'initial'}` : null;
    const {designSettings, generalSettings} = formState;

    // Hydrate local state from API data on initial load only
    useEffect(() => {
        if (design && hydratedDesignVersion === null) {
            setFormState(() => ({
                designSettings: mapApiToDesignSettings(design),
                generalSettings: mapApiToGeneralSettings(design, defaultGeneralSettings)
            }));
            setHydratedDesignVersion(designVersion);
        }
    }, [defaultGeneralSettings, design, designVersion, hydratedDesignVersion, setFormState]);

    const handleDesignChange = useCallback((updates: Partial<EmailDesignSettings>) => {
        setHasSaveError(false);
        toast.dismiss(SAVE_ERROR_TOAST_ID);
        updateForm(state => ({
            ...state,
            designSettings: {...state.designSettings, ...updates}
        }));
    }, [updateForm]);

    const handleGeneralChange = useCallback((updates: Partial<GeneralSettings>) => {
        setHasSaveError(false);
        toast.dismiss(SAVE_ERROR_TOAST_ID);
        updateForm(state => ({
            ...state,
            generalSettings: {...state.generalSettings, ...updates}
        }));
    }, [updateForm]);

    const handleClose = useCallback(() => {
        void modal.hide();
    }, [modal]);

    const emailDomain = (config?.emailDomain as string) || defaultEmailAddress?.split('@')[1] || '';
    const fetchErrorMessage = 'Unable to load email design settings. Please try again.';
    const modalOkProps = hasSaveError ? {
        ...okProps,
        color: 'red' as const,
        label: 'Retry'
    } : okProps;

    return (
        <EmailDesignProvider accentColor={siteData.accent_color} settings={designSettings} onSettingsChange={handleDesignChange}>
            <EmailDesignModal
                afterClose={() => {
                    modal.resolveHide();
                    modal.remove();
                }}
                dirty={saveState === 'unsaved'}
                isLoading={isLoading || isError}
                okProps={modalOkProps}
                open={modal.visible}
                preview={isError ? (
                    <ErrorState message={fetchErrorMessage} />
                ) : (
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
                )}
                sidebar={
                    <Sidebar
                        emailDomain={emailDomain}
                        errorMessage={isError ? fetchErrorMessage : undefined}
                        generalSettings={generalSettings}
                        isLoading={isLoading}
                        siteTitle={siteTitle}
                        onGeneralChange={handleGeneralChange}
                    />
                }
                testId="welcome-email-customize-modal"
                title="Welcome emails"
                onClose={handleClose}
                onSave={() => handleSave({fakeWhenUnchanged: true})}
            />
        </EmailDesignProvider>
    );
});

export default WelcomeEmailCustomizeModal;
