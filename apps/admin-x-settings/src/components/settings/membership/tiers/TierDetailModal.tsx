import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import SortableList from '../../../../admin-x-ds/global/SortableList';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import TierDetailPreview from './TierDetailPreview';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import useSortableIndexedList from '../../../../hooks/useSortableIndexedList';
import {Tier} from '../../../../types/api';
import {useTiers} from '../../../providers/ServiceProvider';

interface TierDetailModalProps {
    tier?: Tier
}

const TierDetailModal: React.FC<TierDetailModalProps> = ({tier}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {update: updateTier, create: createTier} = useTiers();
    const {formState, updateForm, handleSave} = useForm({
        initialState: {
            ...(tier || {}),
            monthly_price: tier?.monthly_price?.toString() || '',
            yearly_price: tier?.monthly_price?.toString() || '',
            trial_days: tier?.trial_days?.toString() || ''
        },
        onSave: async () => {
            const values = {
                ...formState,
                monthly_price: parseFloat(formState.monthly_price),
                yearly_price: parseFloat(formState.yearly_price),
                trial_days: parseFloat(formState.trial_days)
            };

            if (tier?.id) {
                await updateTier({...tier, ...values});
            } else {
                await createTier(values);
            }
        }
    });
    const benefits = useSortableIndexedList({
        items: formState.benefits || [],
        setItems: newBenefits => updateForm(state => ({...state, benefits: newBenefits}))
    });

    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        okLabel='Save & close'
        size='lg'
        title='Tier'
        stickyFooter
        onOk={async () => {
            await handleSave();
            modal.remove();
        }}
    >
        <div className='mt-8 flex items-start gap-10'>
            <div className='flex grow flex-col gap-10'>
                <Form title='Basic'>
                    <TextField
                        placeholder='Bronze'
                        title='Name'
                        value={formState.name || ''}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    />
                    <TextField
                        placeholder='Full access to premium content'
                        title='Description'
                        value={formState.description || ''}
                        onChange={e => updateForm(state => ({...state, description: e.target.value}))}
                    />
                    <div className='flex gap-10'>
                        <div className='flex basis-1/2 flex-col gap-2'>
                            <TextField
                                placeholder='1'
                                title='Prices'
                                value={formState.monthly_price}
                                onChange={e => updateForm(state => ({...state, monthly_price: e.target.value.replace(/[^\d.]/, '')}))}
                            />
                            <TextField
                                placeholder='10'
                                value={formState.yearly_price}
                                onChange={e => updateForm(state => ({...state, yearly_price: e.target.value.replace(/[^\d.]/, '')}))}
                            />
                        </div>
                        <div className='basis-1/2'>
                            <div className='flex justify-between'>
                                <Heading level={6} grey>Add a free trial</Heading>
                                <Toggle onChange={() => {}} />
                            </div>
                            <TextField
                                hint={<>
                                    Members will be subscribed at full price once the trial ends. <a href="https://ghost.org/" rel="noreferrer" target="_blank">Learn more</a>
                                </>}
                                placeholder='0'
                                value={formState.trial_days}
                                disabled
                                onChange={e => updateForm(state => ({...state, trial_days: e.target.value.replace(/^[\d.]/, '')}))}
                            />
                        </div>
                    </div>
                </Form>

                <Form title='Benefits'>
                    <SortableList
                        items={benefits.items}
                        renderItem={({id, item}) => <div className='flex'>
                            <TextField
                                placeholder='Priority support'
                                value={item}
                                onChange={e => benefits.updateItem(id, e.target.value)}
                            />
                            <Button icon='trash' onClick={() => benefits.removeItem(id)} />
                        </div>}
                        onMove={benefits.moveItem}
                    />
                    <Button label="Add" onClick={() => benefits.addItem('')} />
                </Form>
            </div>
            <div className='sticky top-[77px] shrink-0 basis-[380px]'>
                <TierDetailPreview />
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(TierDetailModal);
