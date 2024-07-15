import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect} from 'react';
import {Form, LimitModal, Modal, TextArea, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {numberWithCommas} from '../../../../utils/helpers';
import {useAddNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

const AddNewsletterModal: React.FC<RoutingModalProps> = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();

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
        limiter?.errorIfWouldGoOverLimit('newsletters').catch((error) => {
            if (error instanceof HostLimitError) {
                NiceModal.show(LimitModal, {
                    prompt: error.message || `Your current plan doesn't support more newsletters.`,
                    onOk: () => updateRoute({route: '/pro', isExternal: true})
                });
                modal.remove();
                updateRoute('newsletters');
            } else {
                throw error;
            }
        });
    }, [limiter, modal, updateRoute]);

    const subscriberCount = members?.meta?.pagination.total;

    return <Modal
        afterClose={() => {
            updateRoute('newsletters');
        }}
        backDropClick={false}
        okColor='black'
        okLabel='Create'
        okLoading={saveState === 'saving'}
        size='sm'
        testId='add-newsletter-modal'
        title='Create newsletter'
        onOk={async () => {
            if (await handleSave()) {
                modal.remove();
            }
        }}
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <TextField
                autoFocus={true}
                error={Boolean(errors.name)}
                hint={errors.name}
                maxLength={191}
                placeholder='Weekly roundup'
                title='Name'
                value={formState.name}
                onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                onKeyDown={() => clearError('name')}
            />
            <TextArea
                maxLength={2000}
                title='Description'
                value={formState.description}
                onChange={e => updateForm(state => ({...state, description: e.target.value}))}
            />
            <Toggle
                checked={formState.optInExistingSubscribers}
                direction='rtl'
                hint={formState.optInExistingSubscribers ?
                    `This newsletter will be available to all members. Your ${subscriberCount === undefined ? '' : numberWithCommas(subscriberCount)} existing subscriber${members?.meta?.pagination.total === 1 ? '' : 's'} will also be opted-in to receive it.` :
                    'The newsletter will be available to all new members. Existing members won’t be subscribed, but may visit their account area to opt-in to future emails.'
                }
                label='Opt-in existing subscribers'
                labelStyle='heading'
                onChange={e => updateForm(state => ({...state, optInExistingSubscribers: e.target.checked}))}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddNewsletterModal);
