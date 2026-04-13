import EmailDesignModal from '../../email-design/email-design-modal';
import EmailPreview from '../../email-design/email-preview';
import HeaderImageField from '../../email-design/header-image-field';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import ShowBadgeField from '../../email-design/show-badge-field';
import WelcomeEmailPreviewContent from '../../email-design/welcome-email-preview-content';
import validator from 'validator';
import {type AutomatedEmailDesign, type EditAutomatedEmailDesign, useEditAutomatedEmailDesign, useReadAutomatedEmailDesign} from '@tryghost/admin-x-framework/api/automated-email-design';
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
import {WELCOME_EMAIL_SLUGS, type WelcomeEmailType, getDefaultWelcomeEmailValues} from './default-welcome-email-values';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmailSenders} from '@tryghost/admin-x-framework/api/automated-emails';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useWelcomeEmailSenderDetails} from '../../../../hooks/use-welcome-email-sender-details';

interface GeneralSettings {
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
    headerImage: string;
    showPublicationIcon: boolean;
    showPublicationTitle: boolean;
    showBadge: boolean;
    emailFooter: string;
}

interface WelcomeEmailCustomizeFormState {
    designSettings: EmailDesignSettings;
    generalSettings: GeneralSettings;
}

const SAVE_ERROR_TOAST_ID = 'welcome-email-design-save-error';
const NON_DESIGN_FIELDS = new Set([
    'id',
    'slug',
    'created_at',
    'updated_at',
    'header_image',
    'show_header_icon',
    'show_header_title',
    'show_badge',
    'footer_content'
]);
const PREVIEW_ONLY_FIELDS = new Set([
    'post_title_color',
    'title_alignment'
]);

interface GeneralTabProps {
    generalSettings: GeneralSettings;
    onGeneralChange: (updates: Partial<GeneralSettings>) => void;
    showPublicationIconToggle: boolean;
    senderNamePlaceholder: string;
    senderEmailPlaceholder: string;
    replyToEmailPlaceholder: string;
    showSenderEmailInput: boolean;
    senderNameError?: string;
    senderEmailError?: string;
    replyToEmailError?: string;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
    generalSettings,
    onGeneralChange,
    showPublicationIconToggle,
    senderNamePlaceholder,
    senderEmailPlaceholder,
    replyToEmailPlaceholder,
    showSenderEmailInput,
    senderNameError,
    senderEmailError,
    replyToEmailError
}) => (
    <div className="flex flex-col gap-6 pt-6">
        <section>
            <h4 className="mb-4 font-semibold md:text-lg">Email info</h4>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="welcome-email-sender-name">Sender name</label>
                    <Input
                        id="welcome-email-sender-name"
                        placeholder={senderNamePlaceholder}
                        value={generalSettings.senderName}
                        onChange={e => onGeneralChange({senderName: e.target.value})}
                    />
                    {senderNameError ? <p className='text-xs text-red'>{senderNameError}</p> : null}
                </div>
                {showSenderEmailInput ? (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium" htmlFor="welcome-email-sender-email">Sender email</label>
                        <Input
                            id="welcome-email-sender-email"
                            placeholder={senderEmailPlaceholder}
                            value={generalSettings.senderEmail}
                            onChange={e => onGeneralChange({senderEmail: e.target.value})}
                        />
                        {senderEmailError ? <p className='text-xs text-red'>{senderEmailError}</p> : null}
                    </div>
                ) : null}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="welcome-email-reply-to-email">Reply-to email</label>
                    <Input
                        id="welcome-email-reply-to-email"
                        placeholder={replyToEmailPlaceholder}
                        value={generalSettings.replyToEmail}
                        onChange={e => onGeneralChange({replyToEmail: e.target.value})}
                    />
                    {replyToEmailError ? <p className='text-xs text-red'>{replyToEmailError}</p> : null}
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
                {showPublicationIconToggle && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Publication icon</span>
                        <Switch
                            checked={generalSettings.showPublicationIcon}
                            size='sm'
                            onCheckedChange={checked => onGeneralChange({showPublicationIcon: checked})}
                        />
                    </div>
                )}
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
    showPublicationIconToggle: boolean;
    senderNamePlaceholder: string;
    senderEmailPlaceholder: string;
    replyToEmailPlaceholder: string;
    showSenderEmailInput: boolean;
    senderNameError?: string;
    senderEmailError?: string;
    replyToEmailError?: string;
    isLoading: boolean;
    errorMessage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    generalSettings,
    onGeneralChange,
    showPublicationIconToggle,
    senderNamePlaceholder,
    senderEmailPlaceholder,
    replyToEmailPlaceholder,
    showSenderEmailInput,
    senderNameError,
    senderEmailError,
    replyToEmailError,
    isLoading,
    errorMessage
}) => (
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
                        generalSettings={generalSettings}
                        replyToEmailError={replyToEmailError}
                        replyToEmailPlaceholder={replyToEmailPlaceholder}
                        senderEmailError={senderEmailError}
                        senderEmailPlaceholder={senderEmailPlaceholder}
                        senderNameError={senderNameError}
                        senderNamePlaceholder={senderNamePlaceholder}
                        showPublicationIconToggle={showPublicationIconToggle}
                        showSenderEmailInput={showSenderEmailInput}
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
 * Note: senderName, senderEmail and replyToEmail are not part of the design endpoint.
 *
 * @param {Pick<AutomatedEmailDesign, 'header_image' | 'show_header_icon' | 'show_header_title' | 'show_badge' | 'footer_content'>} apiData - Subset of design fields used for general settings
 * @param {GeneralSettings} defaults - Carries forward sender fields, which are not part of the design API
 * @returns {GeneralSettings} General settings populated from the API response
 */
function mapApiToGeneralSettings(
    apiData: Pick<AutomatedEmailDesign, 'header_image' | 'show_header_icon' | 'show_header_title' | 'show_badge' | 'footer_content'>,
    defaults: GeneralSettings
): GeneralSettings {
    return {
        senderName: defaults.senderName,
        senderEmail: defaults.senderEmail,
        replyToEmail: defaults.replyToEmail,
        headerImage: apiData.header_image || '',
        showPublicationIcon: apiData.show_header_icon,
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
export function mapApiToDesignSettings(
    apiData: PersistedEmailDesignSettings
): EmailDesignSettings {
    const persistedDesign = Object.fromEntries(
        Object.entries(apiData).filter(([key]) => !NON_DESIGN_FIELDS.has(key))
    ) as PersistedEmailDesignSettings;

    return {
        ...persistedDesign,
        // Local-only fields not stored in the backend
        post_title_color: DEFAULT_EMAIL_DESIGN.post_title_color,
        title_alignment: DEFAULT_EMAIL_DESIGN.title_alignment
    };
}

export function buildAutomatedEmailDesignPayload(state: WelcomeEmailCustomizeFormState): EditAutomatedEmailDesign {
    const persistedDesign = Object.fromEntries(
        Object.entries(state.designSettings).filter(([key]) => !PREVIEW_ONLY_FIELDS.has(key) && !NON_DESIGN_FIELDS.has(key))
    );

    return {
        ...persistedDesign,
        header_image: state.generalSettings.headerImage || null,
        show_header_icon: state.generalSettings.showPublicationIcon,
        show_header_title: state.generalSettings.showPublicationTitle,
        show_badge: state.generalSettings.showBadge,
        footer_content: state.generalSettings.emailFooter || null
    };
}

const ErrorState: React.FC<{message: string}> = ({message}) => (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-700 dark:text-gray-300">
        {message}
    </div>
);

const normalizeSenderValue = (value: string | null | undefined) => {
    const trimmed = value?.trim() || '';
    return trimmed || null;
};

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {siteData, settings: globalSettings} = useGlobalData();
    const [siteTitle, defaultEmailAddress, icon] = getSettingValues<string>(globalSettings, ['title', 'default_email_address', 'icon']);

    const handleError = useHandleError();
    const {data: designData, isLoading, isError} = useReadAutomatedEmailDesign();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const {mutateAsync: editDesign} = useEditAutomatedEmailDesign();
    const {mutateAsync: addAutomatedEmail} = useAddAutomatedEmail();
    const {mutateAsync: editAutomatedEmailSenders} = useEditAutomatedEmailSenders();
    const [hasSaveError, setHasSaveError] = useState(false);
    const [senderInputsHydrated, setSenderInputsHydrated] = useState(false);
    const automatedEmails = automatedEmailsData?.automated_emails || [];

    const {
        senderNameInput,
        senderEmailInput,
        replyToEmailInput,
        senderNamePlaceholder,
        senderEmailPlaceholder,
        replyToEmailPlaceholder,
        showSenderEmailInput,
        senderEmailDomain
    } = useWelcomeEmailSenderDetails(automatedEmails);

    const defaultGeneralSettings = useMemo<GeneralSettings>(() => ({
        senderName: senderNameInput,
        senderEmail: senderEmailInput,
        replyToEmail: replyToEmailInput,
        headerImage: '',
        showPublicationIcon: true,
        showPublicationTitle: true,
        showBadge: true,
        emailFooter: ''
    }), [replyToEmailInput, senderEmailInput, senderNameInput]);

    const ensureWelcomeEmailRows = useCallback(async () => {
        const existingBySlug = new Map((automatedEmailsData?.automated_emails || []).map(email => [email.slug, email]));

        for (const emailType of ['free', 'paid'] as WelcomeEmailType[]) {
            if (existingBySlug.has(WELCOME_EMAIL_SLUGS[emailType])) {
                continue;
            }

            const defaults = getDefaultWelcomeEmailValues(emailType, siteTitle);
            const created = await addAutomatedEmail({...defaults, status: 'inactive'});
            const createdEmail = created.automated_emails?.[0];
            if (createdEmail) {
                existingBySlug.set(createdEmail.slug, createdEmail);
            }
        }
    }, [addAutomatedEmail, automatedEmailsData?.automated_emails, siteTitle]);

    const {formState, saveState, updateForm, setFormState, handleSave, okProps, errors} = useForm<WelcomeEmailCustomizeFormState>({
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

            await ensureWelcomeEmailRows();
            const senderPayload = {
                sender_name: normalizeSenderValue(state.generalSettings.senderName),
                sender_reply_to: normalizeSenderValue(state.generalSettings.replyToEmail),
                ...(showSenderEmailInput ? {
                    sender_email: normalizeSenderValue(state.generalSettings.senderEmail)
                } : {})
            };

            const {meta: {sent_email_verification: sentEmailVerification = []} = {}} = await editAutomatedEmailSenders(senderPayload);

            await editDesign(buildAutomatedEmailDesignPayload(state));

            if (sentEmailVerification.length > 0) {
                toast.info('We\u2019ve sent a confirmation email to the new address.');
            }
            setHasSaveError(false);
            toast.dismiss(SAVE_ERROR_TOAST_ID);
        },
        onSaveError: (error) => {
            handleError(error, {withToast: false});
            toast.error('Unable to save email design settings. Please try again.', {
                id: SAVE_ERROR_TOAST_ID
            });
            setHasSaveError(true);
        },
        onValidate: (state) => {
            const validationErrors: Record<string, string> = {};
            const senderEmail = state.generalSettings.senderEmail?.trim();
            const replyToEmail = state.generalSettings.replyToEmail?.trim();

            if (showSenderEmailInput && senderEmail) {
                if (!validator.isEmail(senderEmail)) {
                    validationErrors.senderEmail = 'Enter a valid email address';
                } else if (senderEmailDomain && senderEmail.split('@')[1]?.toLowerCase() !== senderEmailDomain.toLowerCase()) {
                    validationErrors.senderEmail = `Email address must end with @${senderEmailDomain}`;
                }
            }

            if (replyToEmail && !validator.isEmail(replyToEmail)) {
                validationErrors.replyToEmail = 'Enter a valid email address';
            }

            return validationErrors;
        }
    });
    const [hydratedDesignVersion, setHydratedDesignVersion] = useState<string | null>(null);
    const design = designData?.automated_email_design?.[0];
    const designVersion = design ? `${design.id}:${design.updated_at ?? 'initial'}` : null;
    const {designSettings, generalSettings} = formState;

    // Hydrate local state from API data on initial load only
    useEffect(() => {
        if (design && hydratedDesignVersion === null) {
            setFormState(state => ({
                designSettings: mapApiToDesignSettings(design),
                generalSettings: mapApiToGeneralSettings(design, state.generalSettings)
            }));
            setHydratedDesignVersion(designVersion);
        }
    }, [design, designVersion, hydratedDesignVersion, setFormState]);

    useEffect(() => {
        if (senderInputsHydrated || automatedEmailsData === undefined) {
            return;
        }

        setFormState(state => ({
            ...state,
            generalSettings: {
                ...state.generalSettings,
                senderName: senderNameInput,
                senderEmail: senderEmailInput,
                replyToEmail: replyToEmailInput
            }
        }));
        setSenderInputsHydrated(true);
    }, [automatedEmailsData, replyToEmailInput, senderEmailInput, senderInputsHydrated, senderNameInput, setFormState]);

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
        modal.hide();
    }, [modal]);

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
                        replyToEmail={generalSettings.replyToEmail || replyToEmailPlaceholder || ''}
                        senderEmail={generalSettings.senderEmail || senderEmailPlaceholder || defaultEmailAddress || ''}
                        senderName={generalSettings.senderName || senderNamePlaceholder || siteTitle || 'Your site'}
                        settings={designSettings}
                        showBadge={generalSettings.showBadge}
                        showPublicationIcon={generalSettings.showPublicationIcon && Boolean(icon)}
                        showPublicationTitle={generalSettings.showPublicationTitle}
                        showRecipientLine={false}
                        showSubjectLine={false}
                        subject={`Welcome to ${generalSettings.senderName || senderNamePlaceholder || siteTitle || 'our publication'}`}
                    >
                        <WelcomeEmailPreviewContent />
                    </EmailPreview>
                )}
                sidebar={
                    <Sidebar
                        errorMessage={isError ? fetchErrorMessage : undefined}
                        generalSettings={generalSettings}
                        isLoading={isLoading}
                        replyToEmailError={errors.replyToEmail}
                        replyToEmailPlaceholder={replyToEmailPlaceholder}
                        senderEmailError={errors.senderEmail}
                        senderEmailPlaceholder={senderEmailPlaceholder}
                        senderNameError={errors.senderName}
                        senderNamePlaceholder={senderNamePlaceholder}
                        showPublicationIconToggle={Boolean(icon)}
                        showSenderEmailInput={showSenderEmailInput}
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
