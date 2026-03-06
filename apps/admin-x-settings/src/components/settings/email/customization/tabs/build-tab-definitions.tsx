import AutomationContentFields from './content/automation-content-fields';
import NewsletterFooterContentFields from './content/newsletter-footer-content-fields';
import NewsletterHeaderContentFields from './content/newsletter-header-content-fields';
import NewsletterTitleSectionContentFields from './content/newsletter-title-section-content-fields';
import {AutomationHeaderDesignFields} from './design/automation-header-design-fields';
import {BodyDesignFields} from './design/body-design-fields';
import {Button, Form, Toggle} from '@tryghost/admin-x-design-system';
import {GlobalDesignFields} from './design/global-design-fields';
import {HeaderDesignFields} from './design/header-design-fields';
import {NameDescriptionFields} from '../fields/name-description-fields';
import {ReplyToEmailField} from '../fields/reply-to-email-field';
import {SenderEmailField} from '../fields/sender-email-field';
import {SenderNameField} from '../fields/sender-name-field';
import type {AutomationContentDraft, BaseEmailDesignDraft, EmailCustomizationDraft, NewsletterCustomizationDraft, NewsletterDesignDraft, TabDefinition} from '../types';

export const buildGeneralTabDefinition = <TEntity, TDraft extends EmailCustomizationDraft & BaseEmailDesignDraft & AutomationContentDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'generalSettings',
    title: 'General',
    render: ({clearError, draft, emailInfoContext, errors, siteTitle, updateDraft}) => (
        <>
            <Form className='mt-6' gap='sm' margins='lg' title='Email info'>
                <SenderNameField
                    placeholder={siteTitle}
                    value={draft.sender_name}
                    onChange={(senderName) => {
                        updateDraft({sender_name: senderName} as Partial<TDraft>);
                    }}
                />
                {emailInfoContext?.showSenderEmailField && (
                    <SenderEmailField
                        clearError={() => clearError('sender_email')}
                        error={errors.sender_email}
                        placeholder={emailInfoContext.senderEmailPlaceholder}
                        value={draft.sender_email}
                        onChange={(senderEmail) => {
                            updateDraft({sender_email: senderEmail} as Partial<TDraft>);
                        }}
                    />
                )}
                <ReplyToEmailField
                    clearError={() => clearError('sender_reply_to')}
                    error={errors.sender_reply_to}
                    placeholder={emailInfoContext?.replyToPlaceholder || ''}
                    renderedValue={emailInfoContext?.renderedReplyToValue || ''}
                    onChange={(senderReplyTo) => {
                        updateDraft({sender_reply_to: senderReplyTo} as Partial<TDraft>);
                    }}
                />
            </Form>
            <AutomationContentFields
                draft={draft}
                updateDraft={(fields) => {
                    updateDraft(fields as Partial<TDraft>);
                }}
            />
        </>
    )
});

export const buildNewsletterGeneralTabDefinition = <TEntity, TDraft extends NewsletterCustomizationDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'generalSettings',
    title: 'General',
    render: ({clearError, draft, emailInfoContext, errors, generalStatusAction, siteTitle, updateDraft}) => (
        <>
            <NameDescriptionFields
                clearNameError={() => clearError('name')}
                description={draft.description}
                name={draft.name}
                nameError={errors.name}
                onDescriptionChange={(description) => {
                    updateDraft({description} as Partial<TDraft>);
                }}
                onNameChange={(name) => {
                    updateDraft({name} as Partial<TDraft>);
                }}
            />
            <Form className='mt-6' gap='sm' margins='lg' title='Email info'>
                <SenderNameField
                    placeholder={siteTitle}
                    value={draft.sender_name}
                    onChange={(senderName) => {
                        updateDraft({sender_name: senderName} as Partial<TDraft>);
                    }}
                />
                {emailInfoContext?.showSenderEmailField && (
                    <SenderEmailField
                        clearError={() => clearError('sender_email')}
                        error={errors.sender_email}
                        placeholder={emailInfoContext.senderEmailPlaceholder}
                        value={draft.sender_email}
                        onChange={(senderEmail) => {
                            updateDraft({sender_email: senderEmail} as Partial<TDraft>);
                        }}
                    />
                )}
                <ReplyToEmailField
                    clearError={() => clearError('sender_reply_to')}
                    error={errors.sender_reply_to}
                    placeholder={emailInfoContext?.replyToPlaceholder || ''}
                    renderedValue={emailInfoContext?.renderedReplyToValue || ''}
                    onChange={(senderReplyTo) => {
                        updateDraft({sender_reply_to: senderReplyTo} as Partial<TDraft>);
                    }}
                />
            </Form>
            <Form className='mt-6' gap='sm' margins='lg' title='Member settings'>
                <Toggle
                    checked={draft.subscribe_on_signup}
                    direction='rtl'
                    label='Subscribe new members on signup'
                    labelStyle='value'
                    onChange={(event) => {
                        updateDraft({subscribe_on_signup: event.target.checked} as Partial<TDraft>);
                    }}
                />
            </Form>
            {generalStatusAction && (
                <div className='mb-5 mt-10'>
                    <Button
                        color={generalStatusAction.color}
                        label={generalStatusAction.label}
                        link
                        onClick={generalStatusAction.onClick}
                    />
                </div>
            )}
        </>
    )
});

export const buildContentTabDefinition = <TEntity, TDraft extends EmailCustomizationDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'content',
    title: 'Content',
    render: () => (
        <div className='text-grey-800 mt-6 px-7 text-sm'>
            Content customization is coming soon.
        </div>
    )
});

export const buildNewsletterContentTabDefinition = <TEntity, TDraft extends NewsletterCustomizationDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'content',
    title: 'Content',
    render: ({commentsEnabled, draft, siteIcon, updateDraft}) => (
        <>
            <NewsletterHeaderContentFields
                draft={draft}
                siteIcon={siteIcon}
                updateDraft={(fields) => {
                    updateDraft(fields as Partial<TDraft>);
                }}
            />
            <NewsletterTitleSectionContentFields
                draft={draft}
                updateDraft={(fields) => {
                    updateDraft(fields as Partial<TDraft>);
                }}
            />
            <NewsletterFooterContentFields
                commentsEnabled={commentsEnabled}
                draft={draft}
                updateDraft={(fields) => {
                    updateDraft(fields as Partial<TDraft>);
                }}
            />
        </>
    )
});

export const buildDesignTabDefinition = <TEntity, TDraft extends EmailCustomizationDraft & BaseEmailDesignDraft & NewsletterDesignDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'design',
    title: 'Design',
    render: ({accentColor, draft, updateDraft}) => (
        <>
            <GlobalDesignFields draft={draft} updateDraft={updateDraft} />
            <HeaderDesignFields accentColor={accentColor} draft={draft} updateDraft={updateDraft} />
            <BodyDesignFields accentColor={accentColor} draft={draft} updateDraft={updateDraft} />
        </>
    )
});

export const buildAutomationDesignTabDefinition = <TEntity, TDraft extends EmailCustomizationDraft & BaseEmailDesignDraft>(): TabDefinition<TEntity, TDraft> => ({
    id: 'design',
    title: 'Design',
    render: ({accentColor, draft, updateDraft}) => (
        <>
            <GlobalDesignFields draft={draft} updateDraft={updateDraft} />
            <AutomationHeaderDesignFields draft={draft} updateDraft={updateDraft} />
            <BodyDesignFields
                accentColor={accentColor}
                draft={draft}
                sectionTitleLabel='Heading color'
                updateDraft={updateDraft}
            />
        </>
    )
});
