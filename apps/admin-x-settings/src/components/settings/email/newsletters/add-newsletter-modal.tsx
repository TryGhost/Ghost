import LimitModal from '../../../limit-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, Input, Switch, Textarea} from '@tryghost/shade/components';
import {HostLimitError, useLimiter} from '../../../../hooks/use-limiter';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingsModal} from '@tryghost/shade/patterns';
import {formatNumber} from '@tryghost/shade/utils';
import {useAddNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

const AddNewsletterModal: React.FC<RoutingModalProps> = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const returnRoute = useFeatureFlag('automations') ? 'emails' : 'newsletters';
    const handleError = useHandleError();
    const [isCheckingLimit, setIsCheckingLimit] = useState(true);
    const [limitError, setLimitError] = useState<HostLimitError | null>(null);

    const {data: members} = useBrowseMembers({
        searchParams: {filter: 'newsletters.status:active+email_disabled:0', limit: '1', page: '1', include: 'newsletters,labels'}
    });

    const {mutateAsync: addNewsletter} = useAddNewsletter();
    const {formState, updateForm, saveState, handleSave, errors, clearError} = useForm({
        initialState: {
            name: '',
            description: '',
            optInExistingSubscribers: true
        },
        onSave: async () => {
            const response = await addNewsletter({
                name: formState.name,
                description: formState.description,
                opt_in_existing: formState.optInExistingSubscribers,
                feedback_enabled: true
            });

            updateRoute({route: `newsletters/${response.newsletters[0].id}`});
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'A name is required for your newsletter';
            }

            return newErrors;
        }
    });

    const limiter = useLimiter();

    useEffect(() => {
        if (!limiter) {
            setIsCheckingLimit(false);
            return;
        }

        limiter.errorIfWouldGoOverLimit('newsletters')
            .catch((error) => {
                if (error instanceof HostLimitError) {
                    setLimitError(error);
                } else {
                    throw error;
                }
            }).finally(() => {
                setIsCheckingLimit(false);
            });
    }, [limiter]);

    const subscriberCount = members?.meta?.pagination.total;

    useEffect(() => {
        if (limitError) {
            NiceModal.show(LimitModal, {
                prompt: limitError.message || `Your current plan doesn't support more newsletters.`,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
            modal.remove();
            updateRoute(returnRoute);
        }
    }, [limitError, modal, returnRoute, updateRoute]);

    if (isCheckingLimit || limitError) {
        return null;
    }

    return <SettingsModal
        afterClose={() => {
            updateRoute(returnRoute);
        }}
        backDropClick={false}
        okDisabled={saveState === 'saving'}
        okLabel='Create'
        okLoading={saveState === 'saving'}
        okVariant='default'
        size='sm'
        testId='add-newsletter-modal'
        title='Create newsletter'
        onOk={async () => {
            if (await handleSave()) {
                modal.remove();
            }
        }}
    >
        <FieldGroup className='mt-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
            <Field data-invalid={Boolean(errors.name) || undefined}>
                <FieldLabel htmlFor='newsletter-name'>Name</FieldLabel>
                <Input aria-invalid={Boolean(errors.name) || undefined} id='newsletter-name' maxLength={191} placeholder='Weekly roundup' value={formState.name} autoFocus onChange={e => updateForm(state => ({...state, name: e.target.value}))} onKeyDown={() => clearError('name')} />
                {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
            <Field>
                <FieldLabel htmlFor='newsletter-description'>Description</FieldLabel>
                <Textarea className='border-transparent bg-muted' id='newsletter-description' maxLength={2000} value={formState.description} onChange={e => updateForm(state => ({...state, description: e.target.value}))} />
            </Field>
            <Field orientation='horizontal'>
                <FieldContent>
                    <FieldLabel htmlFor='opt-in-existing-subscribers'>Opt-in existing subscribers</FieldLabel>
                    <FieldDescription>
                        {formState.optInExistingSubscribers ?
                            `This newsletter will be available to all members. Your ${subscriberCount === undefined ? '' : formatNumber(subscriberCount)} existing subscriber${members?.meta?.pagination.total === 1 ? '' : 's'} will also be opted-in to receive it.` :
                            'The newsletter will be available to all new members. Existing members won’t be subscribed, but may visit their account area to opt-in to future emails.'
                        }
                    </FieldDescription>
                </FieldContent>
                <Switch checked={formState.optInExistingSubscribers} id='opt-in-existing-subscribers' onCheckedChange={checked => updateForm(state => ({...state, optInExistingSubscribers: checked}))} />
            </Field>
        </FieldGroup>
    </SettingsModal>;
};

export default NiceModal.create(AddNewsletterModal);
