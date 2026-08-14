import LimitModal from '../../../limit-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {Field, FieldError, FieldGroup, FieldLabel, Input} from '@tryghost/shade/components';
import {HostLimitError, useLimiter} from '../../../../hooks/use-limiter';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingsModal} from '@tryghost/shade/patterns';
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

    return <SettingsModal
        afterClose={() => {
            updateRoute('integrations');
        }}
        okLabel='Add'
        okVariant='default'
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
            <FieldGroup className='gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <Field data-invalid={Boolean(errors.name) || undefined}>
                    <FieldLabel htmlFor='integration-name'>Name</FieldLabel>
                    <Input aria-invalid={Boolean(errors.name) || undefined} id='integration-name' maxLength={191} placeholder='Custom integration' value={name} autoFocus onChange={e => setName(e.target.value)} onInput={() => errors.name && setErrors({name: ''})} />
                    {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>
            </FieldGroup>
        </div>
    </SettingsModal>;
};

export default NiceModal.create(AddIntegrationModal);
