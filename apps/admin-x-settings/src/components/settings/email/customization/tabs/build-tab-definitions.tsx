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
import type {AutomationContentFormState, BaseEmailDesignFormState, EmailCustomizationFormState, NewsletterCustomizationFormState, NewsletterDesignFormState, TabDefinition} from '../types';

export const buildGeneralTabDefinition = <TEntity, TFormState extends EmailCustomizationFormState & BaseEmailDesignFormState & AutomationContentFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'generalSettings',
    title: 'General',
    render: ({clearError, formState, emailInfoContext, errors, siteTitle, updateFormState}) => (
        <>
            <Form className='mt-6' gap='sm' margins='lg' title='Email info'>
                <SenderNameField
                    placeholder={siteTitle}
                    value={formState.sender_name}
                    onChange={(senderName) => {
                        updateFormState({sender_name: senderName} as Partial<TFormState>);
                    }}
                />
                {emailInfoContext?.showSenderEmailField && (
                    <SenderEmailField
                        clearError={() => clearError('sender_email')}
                        error={errors.sender_email}
                        placeholder={emailInfoContext.senderEmailPlaceholder}
                        value={formState.sender_email}
                        onChange={(senderEmail) => {
                            updateFormState({sender_email: senderEmail} as Partial<TFormState>);
                        }}
                    />
                )}
                <ReplyToEmailField
                    clearError={() => clearError('sender_reply_to')}
                    error={errors.sender_reply_to}
                    placeholder={emailInfoContext?.replyToPlaceholder || ''}
                    renderedValue={emailInfoContext?.renderedReplyToValue || ''}
                    onChange={(senderReplyTo) => {
                        updateFormState({sender_reply_to: senderReplyTo} as Partial<TFormState>);
                    }}
                />
            </Form>
            <AutomationContentFields
                formState={formState}
                updateFormState={(fields) => {
                    updateFormState(fields as Partial<TFormState>);
                }}
            />
        </>
    )
});

export const buildNewsletterGeneralTabDefinition = <TEntity, TFormState extends NewsletterCustomizationFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'generalSettings',
    title: 'General',
    render: ({clearError, formState, emailInfoContext, errors, generalStatusAction, siteTitle, updateFormState}) => (
        <>
            <NameDescriptionFields
                clearNameError={() => clearError('name')}
                description={formState.description}
                name={formState.name}
                nameError={errors.name}
                onDescriptionChange={(description) => {
                    updateFormState({description} as Partial<TFormState>);
                }}
                onNameChange={(name) => {
                    updateFormState({name} as Partial<TFormState>);
                }}
            />
            <Form className='mt-6' gap='sm' margins='lg' title='Email info'>
                <SenderNameField
                    placeholder={siteTitle}
                    value={formState.sender_name}
                    onChange={(senderName) => {
                        updateFormState({sender_name: senderName} as Partial<TFormState>);
                    }}
                />
                {emailInfoContext?.showSenderEmailField && (
                    <SenderEmailField
                        clearError={() => clearError('sender_email')}
                        error={errors.sender_email}
                        placeholder={emailInfoContext.senderEmailPlaceholder}
                        value={formState.sender_email}
                        onChange={(senderEmail) => {
                            updateFormState({sender_email: senderEmail} as Partial<TFormState>);
                        }}
                    />
                )}
                <ReplyToEmailField
                    clearError={() => clearError('sender_reply_to')}
                    error={errors.sender_reply_to}
                    placeholder={emailInfoContext?.replyToPlaceholder || ''}
                    renderedValue={emailInfoContext?.renderedReplyToValue || ''}
                    onChange={(senderReplyTo) => {
                        updateFormState({sender_reply_to: senderReplyTo} as Partial<TFormState>);
                    }}
                />
            </Form>
            <Form className='mt-6' gap='sm' margins='lg' title='Member settings'>
                <Toggle
                    checked={formState.subscribe_on_signup}
                    direction='rtl'
                    label='Subscribe new members on signup'
                    labelStyle='value'
                    onChange={(event) => {
                        updateFormState({subscribe_on_signup: event.target.checked} as Partial<TFormState>);
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

export const buildContentTabDefinition = <TEntity, TFormState extends EmailCustomizationFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'content',
    title: 'Content',
    render: () => (
        <div className='mt-6 px-7 text-sm text-grey-800'>
            Content customization is coming soon.
        </div>
    )
});

export const buildNewsletterContentTabDefinition = <TEntity, TFormState extends NewsletterCustomizationFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'content',
    title: 'Content',
    render: ({commentsEnabled, formState, siteIcon, updateFormState}) => (
        <>
            <NewsletterHeaderContentFields
                formState={formState}
                siteIcon={siteIcon}
                updateFormState={(fields) => {
                    updateFormState(fields as Partial<TFormState>);
                }}
            />
            <NewsletterTitleSectionContentFields
                formState={formState}
                updateFormState={(fields) => {
                    updateFormState(fields as Partial<TFormState>);
                }}
            />
            <NewsletterFooterContentFields
                commentsEnabled={commentsEnabled}
                formState={formState}
                updateFormState={(fields) => {
                    updateFormState(fields as Partial<TFormState>);
                }}
            />
        </>
    )
});

export const buildDesignTabDefinition = <TEntity, TFormState extends EmailCustomizationFormState & BaseEmailDesignFormState & NewsletterDesignFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'design',
    title: 'Design',
    render: ({accentColor, formState, updateFormState}) => (
        <>
            <GlobalDesignFields formState={formState} updateFormState={updateFormState} />
            <HeaderDesignFields accentColor={accentColor} formState={formState} updateFormState={updateFormState} />
            <BodyDesignFields accentColor={accentColor} formState={formState} updateFormState={updateFormState} />
        </>
    )
});

export const buildAutomationDesignTabDefinition = <TEntity, TFormState extends EmailCustomizationFormState & BaseEmailDesignFormState>(): TabDefinition<TEntity, TFormState> => ({
    id: 'design',
    title: 'Design',
    render: ({accentColor, formState, updateFormState}) => (
        <>
            <GlobalDesignFields formState={formState} updateFormState={updateFormState} />
            <AutomationHeaderDesignFields formState={formState} updateFormState={updateFormState} />
            <BodyDesignFields
                accentColor={accentColor}
                formState={formState}
                sectionTitleLabel='Heading color'
                updateFormState={updateFormState}
            />
        </>
    )
});
