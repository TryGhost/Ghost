import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {Form, LimitModal, Modal, TextField} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useCreateIntegration} from '@tryghost/admin-x-framework/api/integrations';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const AddIntegrationModal: React.FC<RoutingModalProps> = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const [name, setName] = useState('');
    const [errors, setErrors] = useState({name: ''});
    const {mutateAsync: createIntegration} = useCreateIntegration();
    const limiter = useLimiter();
    const handleError = useHandleError();

    useEffect(() => {
        if (limiter?.isLimited('customIntegrations')) {
            limiter.errorIfWouldGoOverLimit('customIntegrations').catch((error) => {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        prompt: error.message || `Your current plan doesn't support more custom integrations.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                    });
                    modal.remove();
                    updateRoute('integrations');
                }
            });
        }
    }, [limiter, modal, updateRoute]);

    return <Modal
        afterClose={() => {
            updateRoute('integrations');
        }}
        okColor='black'
        okLabel='Add'
        size='sm'
        testId='add-integration-modal'
        title='Add integration'
        onOk={async () => {
            if (!name) {
                setErrors({name: 'Name is required'});
                return;
            }

            try {
                const data = await createIntegration({name});
                modal.remove();
                updateRoute({route: `integrations/${data.integrations[0].id}`});
            } catch (e) {
                handleError(e);
            }
        }}
    >
        <div className='mt-5'>
            <Form
                marginBottom={false}
                marginTop={false}
            >
                <TextField
                    autoFocus={true}
                    error={!!errors.name}
                    hint={errors.name}
                    maxLength={191}
                    placeholder='Custom integration'
                    title='Name'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onInput={() => {
                        if (errors.name) {
                            setErrors({name: ''});
                        }
                    }}
                />
            </Form>
        </div>
    </Modal>;
};

export default NiceModal.create(AddIntegrationModal);
