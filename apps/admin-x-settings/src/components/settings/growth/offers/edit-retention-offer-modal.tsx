import {ButtonSelect, type OfferType} from './add-offer-modal';
import {Form, PreviewModalContent, Select, type SelectOption, TextArea, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {useForm} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RetentionOfferFormState = {
    enabled: boolean;
    displayTitle: string;
    displayDescription: string;
    type: 'percent' | 'trial';
    percentAmount: number;
    duration: string;
    durationInMonths: number;
    freeMonths: number;
};

const typeOptions: OfferType[] = [
    {title: 'Percentage discount', description: 'Offer a special reduced price'},
    {title: 'Free month(s)', description: 'Give free access for a limited time'}
];

const durationOptions: SelectOption[] = [
    {value: 'once', label: 'First-payment'},
    {value: 'repeating', label: 'Multiple-months'},
    {value: 'forever', label: 'Forever'}
];

const getDefaultState = (id: string): RetentionOfferFormState => {
    if (id === 'monthly') {
        return {
            enabled: true,
            displayTitle: '',
            displayDescription: '',
            type: 'percent',
            percentAmount: 20,
            duration: 'once',
            durationInMonths: 1,
            freeMonths: 1
        };
    }
    return {
        enabled: false,
        displayTitle: '',
        displayDescription: '',
        type: 'percent',
        percentAmount: 0,
        duration: 'once',
        durationInMonths: 1,
        freeMonths: 1
    };
};

const RetentionOfferSidebar: React.FC<{
    formState: RetentionOfferFormState;
    updateForm: (updater: (state: RetentionOfferFormState) => RetentionOfferFormState) => void;
    cadence: 'monthly' | 'yearly';
}> = ({formState, updateForm, cadence}) => {
    return (
        <div className='flex grow flex-col pt-2'>
            <Form className='grow'>
                <section>
                    <div className='flex flex-col gap-5 rounded-md border border-grey-300 p-4 pb-3.5 dark:border-grey-800'>
                        <div className='flex flex-col gap-1.5'>
                            <span className='text-xs font-semibold leading-none text-grey-700'>Performance</span>
                            <span>0 redemptions</span>
                        </div>
                    </div>
                </section>
                <section className='mt-4'>
                    <Toggle
                        checked={formState.enabled}
                        direction='rtl'
                        hint={cadence === 'monthly' ? 'Applied to monthly plans' : 'Applied to annual plans'}
                        label={`Enable ${cadence} retention`}
                        onChange={(e) => {
                            updateForm(state => ({...state, enabled: e.target.checked}));
                        }}
                    />
                </section>
                {formState.enabled && (
                    <>
                        <section className='mt-4'>
                            <h2 className='mb-4 text-lg'>General</h2>
                            <div className='flex flex-col gap-6'>
                                <TextField
                                    placeholder='Before you go...'
                                    title='Display title'
                                    value={formState.displayTitle}
                                    onChange={(e) => {
                                        updateForm(state => ({...state, displayTitle: e.target.value}));
                                    }}
                                />
                                <TextArea
                                    placeholder='We&#39;d hate to see you go! How about a special offer to stay?'
                                    title='Display description'
                                    value={formState.displayDescription}
                                    onChange={(e) => {
                                        updateForm(state => ({...state, displayDescription: e.target.value}));
                                    }}
                                />
                            </div>
                        </section>
                        <section className='mt-4'>
                            <h2 className='mb-4 text-lg'>Details</h2>
                            <div className='flex flex-col gap-6'>
                                <div className='flex flex-col gap-4 rounded-md border border-grey-200 p-4 dark:border-grey-800'>
                                    <ButtonSelect
                                        checked={formState.type === 'percent'}
                                        type={typeOptions[0]}
                                        onClick={() => {
                                            updateForm(state => ({...state, type: 'percent'}));
                                        }}
                                    />
                                    <ButtonSelect
                                        checked={formState.type === 'trial'}
                                        type={typeOptions[1]}
                                        onClick={() => {
                                            updateForm(state => ({...state, type: 'trial'}));
                                        }}
                                    />
                                </div>
                                {formState.type === 'percent' && (
                                    <>
                                        <TextField
                                            rightPlaceholder='%'
                                            title='Amount off'
                                            type='number'
                                            value={formState.percentAmount === 0 ? '' : String(formState.percentAmount)}
                                            onChange={(e) => {
                                                updateForm(state => ({...state, percentAmount: Number(e.target.value)}));
                                            }}
                                        />
                                        <Select
                                            options={durationOptions}
                                            selectedOption={durationOptions.find(option => option.value === formState.duration)}
                                            title='Duration'
                                            onSelect={(e) => {
                                                if (e) {
                                                    updateForm(state => ({...state, duration: e.value}));
                                                }
                                            }}
                                        />
                                        {formState.duration === 'repeating' && (
                                            <TextField
                                                rightPlaceholder={`${formState.durationInMonths === 1 ? 'month' : 'months'}`}
                                                title='Duration in months'
                                                type='number'
                                                value={formState.durationInMonths === 0 ? '' : String(formState.durationInMonths)}
                                                onChange={(e) => {
                                                    updateForm(state => ({...state, durationInMonths: Number(e.target.value)}));
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                                {formState.type === 'trial' && (
                                    <TextField
                                        rightPlaceholder={`${formState.freeMonths === 1 ? 'month' : 'months'}`}
                                        title='Free months'
                                        type='number'
                                        value={formState.freeMonths === 0 ? '' : String(formState.freeMonths)}
                                        onChange={(e) => {
                                            updateForm(state => ({...state, freeMonths: Number(e.target.value)}));
                                        }}
                                    />
                                )}
                            </div>
                        </section>
                    </>
                )}
            </Form>
        </div>
    );
};

const EditRetentionOfferModal: React.FC<{id: string}> = ({id}) => {
    const {updateRoute} = useRouting();
    const cadence = id === 'monthly' ? 'monthly' : 'yearly' as const;
    const breadcrumbTitle = cadence === 'monthly' ? 'Monthly retention' : 'Yearly retention';

    const {formState, updateForm, saveState, okProps} = useForm({
        initialState: getDefaultState(id),
        savingDelay: 500,
        onSave: async () => {
            // No-op for now — API wiring will be added later
        },
        onSaveError: () => {},
        onValidate: () => {
            return {};
        }
    });

    const goBack = () => {
        updateRoute('offers/edit/retention');
    };

    const sidebar = (
        <RetentionOfferSidebar
            cadence={cadence}
            formState={formState}
            updateForm={updateForm}
        />
    );

    const preview = (
        <div className='flex h-full items-center justify-center text-sm text-grey-400'>
        </div>
    );

    return (
        <PreviewModalContent
            afterClose={() => updateRoute('offers')}
            backDropClick={false}
            cancelLabel='Cancel'
            deviceSelector={false}
            dirty={saveState === 'unsaved'}
            height='full'
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            preview={preview}
            previewToolbarBreadcrumbs={[
                {label: 'Offers', onClick: goBack},
                {label: breadcrumbTitle}
            ]}
            sidebar={sidebar}
            size='lg'
            testId='retention-offer-modal'
            title='Offer'
            width={1140}
            onBreadcrumbsBack={goBack}
            onCancel={goBack}
            onOk={async () => {
                // No-op for now — API wiring will be added later
            }}
        />
    );
};

export default EditRetentionOfferModal;
