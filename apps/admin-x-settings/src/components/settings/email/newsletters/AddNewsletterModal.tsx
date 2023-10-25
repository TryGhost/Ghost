import Form from '../../../../admin-x-ds/global/form/Form';
import LimitModal from '../../../../admin-x-ds/global/modal/LimitModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect} from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';
import {useAddNewsletter} from '../../../../api/newsletters';
import {useBrowseMembers} from '../../../../api/members';

const AddNewsletterModal: React.FC<RoutingModalProps> = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();

    const {data: members} = useBrowseMembers({
        searchParams: {filter: 'newsletters.status:active+email_disabled:0', limit: '1', page: '1', include: 'newsletters,labels'}
    });

    const {mutateAsync: addNewsletter} = useAddNewsletter();
    const {formState, updateForm, handleSave, errors, clearError} = useForm({
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
                newErrors.name = 'Please enter a name';
            }

            return newErrors;
        }
    });

    const limiter = useLimiter();

    useEffect(() => {
        limiter?.errorIfWouldGoOverLimit('newsletters').catch((error) => {
            if (error instanceof HostLimitError) {
                NiceModal.show(LimitModal, {
                    prompt: error.message || `Your current plan doesn't support more newsletters.`
                });
                modal.remove();
                updateRoute('newsletters');
            } else {
                throw error;
            }
        });
    }, [limiter, modal, updateRoute]);

    return <Modal
        afterClose={() => {
            updateRoute('newsletters');
        }}
        okColor='black'
        okLabel='Create'
        size='sm'
        testId='add-newsletter-modal'
        title='Create newsletter'
        onOk={async () => {
            toast.remove();
            if (await handleSave()) {
                modal.remove();
            } else {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save newsletter, please double check that you\'ve filled all mandatory fields.'
                });
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
                placeholder='Weekly roundup'
                title='Name'
                value={formState.name}
                onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                onKeyDown={() => clearError('name')}
            />
            <TextArea
                title='Description'
                value={formState.description}
                onChange={e => updateForm(state => ({...state, description: e.target.value}))}
            />
            <Toggle
                checked={formState.optInExistingSubscribers}
                direction='rtl'
                hint={formState.optInExistingSubscribers ?
                    `This newsletter will be available to all members. Your ${members?.meta?.pagination.total} existing subscriber${members?.meta?.pagination.total === 1 ? '' : 's'} will also be opted-in to receive it.` :
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
