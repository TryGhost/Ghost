import PortalFrame from '../../membership/portal/portal-frame';
import {Button, Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, Input, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea} from '@tryghost/shade/components';
import {type ErrorMessages, useForm} from '@tryghost/admin-x-framework/hooks';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {PreviewModalContent} from '../../preview-modal';
import {formatNumber} from '@tryghost/shade/utils';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes} from '../../../../utils/get-offers-portal-preview-url';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {getTiersCadences} from '../../../../utils/get-tiers-cadences';
import {toast} from 'sonner';
import {useAddOffer} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useEffect, useMemo, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

// we should replace this with a library
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

interface OfferType {
    title: string;
    description: string;
    value: string;
}

const MAX_DISPLAY_TEXT_LENGTH = 191;

type formStateTypes = {
    disableBackground?: boolean;
    name: string;
    code: {
        isDirty: boolean;
        value: string;
    };
    displayTitle: {
        isDirty: boolean;
        value: string;
    };
    displayDescription: string;
    type: string;
    cadence: string;
    amount: number;
    duration: string;
    durationInMonths: number;
    currency: string;
    status: string;
    tierId: string;
    fixedAmount?: number;
    trialAmount?: number;
    percentAmount?: number;
};

interface OfferSelectOption {
    label: string;
    value: string;
}

const calculateAmount = (formState: formStateTypes): number => {
    const {fixedAmount = 0, percentAmount = 0, trialAmount = 0, amount = 0} = formState;

    switch (formState.type) {
    case 'fixed':
        return fixedAmount * 100;
    case 'percent':
        return percentAmount;
    case 'trial':
        return trialAmount;
    default:
        return amount;
    }
};

type SidebarProps = {
    tierOptions: OfferSelectOption[];
    handleTierChange: (tier: OfferSelectOption) => void;
    selectedTier: OfferSelectOption;
    overrides: formStateTypes;
    // handleTextInput: (e: React.ChangeEvent<HTMLInputElement>, key: keyof offerPortalPreviewUrlTypes) => void;
    amountOptions: OfferSelectOption[];
    typeOptions: OfferType[];
    durationOptions: OfferSelectOption[];
    handleTypeChange: (type: string) => void;
    handleDurationChange: (duration: string) => void;
    handleAmountTypeChange: (amountType: string) => void;
    handleNameInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTextAreaInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleDisplayTitleInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAmountInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDurationInMonthsInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCodeInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    validate: () => void;
    clearError: (field: string) => void;
    testId: string;
    errors: ErrorMessages;
    handleTrialAmountInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const Sidebar: React.FC<SidebarProps> = ({tierOptions,
    handleTierChange,
    selectedTier,
    // handleTextInput,
    typeOptions,
    durationOptions,
    handleTypeChange,
    handleDurationChange,
    overrides,
    handleAmountTypeChange,
    handleNameInput,
    handleTextAreaInput,
    handleDisplayTitleInput,
    handleDurationInMonthsInput,
    handleAmountInput,
    handleCodeInput,
    clearError,
    errors,
    testId,
    handleTrialAmountInput,
    amountOptions}) => {
    // const handleError = useHandleError();
    const isYearlyTier = overrides.cadence === 'year';
    const filteredDurationOptions = isYearlyTier
        ? durationOptions.filter(option => option.value !== 'repeating')
        : durationOptions;

    const [nameLength, setNameLength] = useState(0);
    const nameLengthColor = nameLength > 40 ? 'text-red' : 'text-green';

    const {siteData} = useGlobalData();
    const [isCopied, setIsCopied] = useState(false);
    const homepageUrl = getHomepageUrl(siteData!);
    const offerUrl = `${homepageUrl}${overrides.code.value}`;
    const handleCopyClick = async () => {
        await navigator.clipboard.writeText(offerUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className='pt-7' data-testid={testId}>
            <FieldGroup className='mb-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <section>
                    <h2 className='mb-4 text-lg'>General</h2>
                    <div className='flex flex-col gap-6'>
                        <Field data-invalid={Boolean(errors.name) || undefined}>
                            <FieldLabel htmlFor='offer-name'>Offer name</FieldLabel>
                            <Input aria-invalid={Boolean(errors.name) || undefined} id='offer-name' maxLength={40} placeholder='Black Friday' onChange={(e) => {
                                handleNameInput(e);
                                setNameLength(e.target.value.length);
                            }} onKeyDown={() => clearError('name')} />
                            {errors.name ? <FieldError>{errors.name}</FieldError> : <FieldDescription><div className='flex justify-between'><span>Visible to members on Stripe Checkout page</span><strong><span className={nameLengthColor}>{formatNumber(nameLength)}</span> / {formatNumber(40)}</strong></div></FieldDescription>}
                        </Field>
                        <Field data-invalid={Boolean(errors.displayTitle) || undefined}>
                            <FieldLabel htmlFor='offer-display-title'>Display title</FieldLabel>
                            <Input aria-invalid={Boolean(errors.displayTitle) || undefined} id='offer-display-title' maxLength={MAX_DISPLAY_TEXT_LENGTH} placeholder='Black Friday Special' value={overrides.displayTitle.value} onChange={(e) => {
                                handleDisplayTitleInput(e);
                            }} onKeyDown={() => clearError('displayTitle')} />
                            {errors.displayTitle && <FieldError>{errors.displayTitle}</FieldError>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='offer-display-description'>Display description</FieldLabel>
                            <Textarea
                                className='border-transparent bg-muted'
                                id='offer-display-description'
                                maxLength={MAX_DISPLAY_TEXT_LENGTH}
                                placeholder='Take advantage of this limited-time offer.'
                                value={overrides.displayDescription}
                                onChange={(e) => {
                                    handleTextAreaInput(e);
                                }}
                            />
                        </Field>
                    </div>
                </section>
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Details</h2>
                    <div className='flex flex-col gap-6'>
                        <RadioGroup
                            aria-label='Offer type'
                            className='rounded-md border border-border-default p-4'
                            value={overrides.type === 'trial' ? 'trial' : 'percent'}
                            onValueChange={handleTypeChange}
                        >
                            {typeOptions.map((option) => {
                                const id = `offer-type-${option.value}`;
                                return (
                                    <Field key={option.value} orientation='horizontal'>
                                        <RadioGroupItem id={id} indicator='check' value={option.value} />
                                        <FieldContent>
                                            <FieldLabel className='cursor-pointer' htmlFor={id}>{option.title}</FieldLabel>
                                            <FieldDescription>{option.description}</FieldDescription>
                                        </FieldContent>
                                    </Field>
                                );
                            })}
                        </RadioGroup>
                        <Field>
                            <FieldLabel>Tier — Cadence</FieldLabel>
                            <Select value={selectedTier.value} onValueChange={(value) => {
                                const tier = tierOptions.find(option => option.value === value);
                                if (tier) {
                                    handleTierChange(tier);
                                }
                            }}>
                                <SelectTrigger aria-label='Tier — Cadence' data-testid='tier-cadence-select-offers'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {tierOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        {
                            overrides.type !== 'trial' && <>
                                <Field data-invalid={Boolean(errors.amount) || undefined}>
                                    <FieldLabel htmlFor='offer-amount'>Amount off</FieldLabel>
                                    <InputGroup className='h-[var(--control-height)] border-transparent bg-muted' data-invalid={Boolean(errors.amount) || undefined}>
                                        <InputGroupInput
                                            id='offer-amount'
                                            type='number'
                                            value={
                                                overrides.type === 'fixed'
                                                    ? (overrides.fixedAmount === 0 ? '' : overrides.fixedAmount?.toString())
                                                    : (overrides.percentAmount === 0 ? '' : overrides.percentAmount?.toString())
                                            }
                                            onChange={(e) => {
                                                handleAmountInput(e);
                                            }}
                                            onKeyDown={() => clearError('amount')}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <Select
                                                value={overrides.type === 'percent' ? amountOptions[0].value : amountOptions[1].value}
                                                onValueChange={handleAmountTypeChange}
                                            >
                                                <SelectTrigger aria-label='Amount type' className='h-7 w-20 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0' data-testid='amount-type-select-offers'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent align='end'>
                                                    {amountOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    {errors.amount && <FieldError>{errors.amount}</FieldError>}
                                </Field>
                                <Field>
                                    <FieldLabel>Duration</FieldLabel>
                                    <Select value={overrides.duration} onValueChange={(value) => {
                                        clearError('durationInMonths');
                                        handleDurationChange(value);
                                    }}>
                                        <SelectTrigger aria-label='Duration' data-testid='duration-select-offers'><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {filteredDurationOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                {
                                    overrides.duration === 'repeating' && !isYearlyTier && <div className='-mt-4'>
                                        <Field data-invalid={Boolean(errors.durationInMonths) || undefined}>
                                            <InputGroup className='h-[var(--control-height)] border-transparent bg-muted' data-invalid={Boolean(errors.durationInMonths) || undefined}>
                                                <InputGroupInput aria-invalid={Boolean(errors.durationInMonths) || undefined} data-testid='duration-months-input' type='number' value={overrides.durationInMonths === 0 ? '' : String(overrides.durationInMonths)} onChange={(e) => {
                                                handleDurationInMonthsInput(e);
                                                }} onKeyDown={() => clearError('durationInMonths')} />
                                                <InputGroupAddon align='inline-end'><InputGroupText>{overrides.durationInMonths === 1 ? 'month' : 'months'}</InputGroupText></InputGroupAddon>
                                            </InputGroup>
                                            {errors.durationInMonths && <FieldError>{errors.durationInMonths}</FieldError>}
                                        </Field>
                                    </div>
                                }
                            </>
                        }

                        {
                            overrides.type === 'trial' && <Field data-invalid={Boolean(errors.amount) || undefined}>
                                <FieldLabel htmlFor='trial-duration'>Trial duration</FieldLabel>
                                <Input aria-invalid={Boolean(errors.amount) || undefined} id='trial-duration' type='number' value={overrides.trialAmount?.toString()} onChange={(e) => {
                                    handleTrialAmountInput(e);
                                }} onKeyDown={() => clearError('amount')} />
                                {errors.amount && <FieldError>{errors.amount}</FieldError>}
                            </Field>

                        }

                        <Field data-invalid={Boolean(errors.code) || undefined}>
                            <FieldLabel htmlFor='offer-code'>Offer code</FieldLabel>
                            <Input aria-invalid={Boolean(errors.code) || undefined} id='offer-code' placeholder='black-friday' value={overrides.code.value} onChange={(e) => {
                                handleCodeInput(e);
                            }} onKeyDown={() => clearError('code')} />
                            {errors.code ? <FieldError>{errors.code}</FieldError> : overrides.code.value !== '' && <FieldDescription><div className='flex items-center justify-between'><div>{homepageUrl}<span className='font-bold'>{overrides.code.value}</span></div><Button className='h-auto p-0 text-sm text-green hover:text-green' size='sm' type='button' variant='link' onClick={handleCopyClick}>{isCopied ? 'Copied' : 'Copy'}</Button></div></FieldDescription>}
                        </Field>
                    </div>
                </section>
            </FieldGroup>
        </div>
    );
};

const parseData = (input: string): { id: string; period: string; currency: string } => {
    const [id, period, currency] = input.split('-');
    if (!id || !period || !currency) {
        throw new Error('Invalid input format. Expected format is: id-period-currency');
    }
    return {id, period, currency};
};

const AddOfferModal = () => {
    const {siteData} = useGlobalData();
    const typeOptions = [
        {title: 'Discount', description: 'Offer a special reduced price', value: 'percent'},
        {title: 'Free trial', description: 'Give free access for a limited time', value: 'trial'}
    ];

    const durationOptions = [
        {value: 'once', label: 'First-payment'},
        {value: 'repeating', label: 'Multiple-months'},
        {value: 'forever', label: 'Forever'}
    ];

    const [href, setHref] = useState<string>('');
    const {updateRoute} = useRouting();
    const {data: {tiers} = {}} = useBrowseTiers();
    const activeTiers = getPaidActiveTiers(tiers || []);
    const tierCadenceOptions = getTiersCadences(activeTiers);
    const {mutateAsync: addOffer} = useAddOffer();
    const [selectedTier, setSelectedTier] = useState({
        tier: tierCadenceOptions[0] || {},
        dataset: {
            id: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).id : '',
            period: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).period : '',
            currency: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).currency : ''
        }
    });

    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();

    const {formState, updateForm, handleSave, saveState, okProps, validate, errors, clearError} = useForm({
        initialState: {
            disableBackground: false,
            name: '',
            code: {
                isDirty: false,
                value: ''
            },
            displayTitle: {
                isDirty: false,
                value: ''
            },
            displayDescription: '',
            type: 'percent',
            cadence: selectedTier?.dataset?.period || '',
            amount: 0,
            duration: 'once',
            durationInMonths: 1,
            currency: selectedTier?.dataset?.currency || 'USD',
            status: 'active',
            tierId: selectedTier?.dataset?.id || '',
            trialAmount: 7,
            fixedAmount: 0,
            percentAmount: 0
        },
        onSave: async () => {
            const duration = formState.type === 'trial' ? 'trial' : formState.duration;
            const dataset = {
                name: formState.name,
                code: formState.code.value,
                display_title: formState.displayTitle.value,
                display_description: formState.displayDescription,
                cadence: formState.cadence,
                amount: calculateAmount(formState) || 0,
                duration,
                ...(duration === 'repeating' ? {duration_in_months: formState.durationInMonths} : {}),
                currency: formState.currency,
                status: formState.status,
                redemption_type: 'signup' as const,
                tier: {
                    id: formState.tierId
                },
                type: formState.type,
                currency_restriction: false
            };

            const response = await addOffer(dataset);

            if (response && response.offers && response.offers.length > 0) {
                updateRoute(`offers/success/${response.offers[0].id}`);
            }
        },
        onSaveError: () => {},
        onValidate: () => {
            const newErrors : Record<string, string> = {};

            if (!formState.name && formState.name.length === 0) {
                newErrors.name = 'Name is required';
            }

            if (!formState.code.value && formState.code.value.length === 0) {
                newErrors.code = 'Code is required';
            }

            if (!formState.displayTitle.value && formState.displayTitle.value.length === 0) {
                newErrors.displayTitle = 'Display title is required';
            }

            if (formState.type === 'percent' && formState.percentAmount === 0) {
                newErrors.amount = 'Enter an amount greater than 0.';
            }

            if (formState.type === 'percent' && (formState.percentAmount < 1 || formState.percentAmount > 100)) {
                newErrors.amount = 'Enter an amount between 1 and 100%.';
            }

            if (formState.type === 'fixed' && formState.fixedAmount === 0 || formState.type === 'fixed' && formState.fixedAmount < 1) {
                newErrors.amount = 'Enter an amount greater than 0.';
            }

            if (formState.type === 'trial' && formState.trialAmount === 0) {
                newErrors.amount = 'Enter an amount greater than 0.';
            }

            if (formState.type === 'trial' && formState.trialAmount < 1) {
                newErrors.amount = 'Free trial must be at least 1 day.';
            }

            if (formState.type !== 'trial' && formState.duration === 'repeating' && (!Number.isInteger(formState.durationInMonths) || formState.durationInMonths < 1)) {
                newErrors.durationInMonths = 'Enter a whole number of months (1 or more).';
            }

            return newErrors;
        },
        savingDelay: 500
    });

    const amountOptions = [
        {value: 'percent', label: '%'},
        {value: 'fixed', label: formState.currency}
    ];

    const handleTierChange = (tier: OfferSelectOption) => {
        const parsedTier = parseData(tier.value);
        const isYearlyCadence = parsedTier.period === 'year';

        setSelectedTier({
            tier,
            dataset: parsedTier
        });
        updateForm(state => ({
            ...state,
            cadence: parsedTier.period,
            currency: parsedTier.currency,
            tierId: parsedTier.id,
            duration: isYearlyCadence && state.duration === 'repeating' ? 'once' : state.duration
        }));

        if (isYearlyCadence) {
            clearError('durationInMonths');
        }
    };

    const handleTypeChange = (type: string) => {
        if (type === 'trial') {
            clearError('amount');
            clearError('durationInMonths');
        }

        updateForm(state => ({
            ...state,
            type: type
        }));
    };

    const handleAmountTypeChange = (amountType: string) => {
        updateForm(state => ({
            ...state,
            type: amountType === 'percent' ? 'percent' : 'fixed'
        }));
    };

    const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;

        if (formState.type === 'fixed') {
            updateForm(state => ({
                ...state,
                fixedAmount: Number(target.value)
            }));
        } else if (formState.type === 'percent') {
            updateForm(state => ({
                ...state,
                percentAmount: Number(target.value)
            }));
        } else {
            updateForm(state => ({
                ...state,
                amount: Number(target.value)
            }));
        }
    };

    const handleDurationInMonthsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const nextValue = Number(target.value);

        updateForm(state => ({
            ...state,
            durationInMonths: Number.isNaN(nextValue) ? 0 : nextValue
        }));
    };

    const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        updateForm((prevOverrides) => {
            const newOverrides = {...prevOverrides};
            newOverrides.name = newValue;
            if (!prevOverrides.code.isDirty) {
                clearError('code');
                newOverrides.code = {
                    ...prevOverrides.code,
                    value: slugify(newValue)
                };
            }
            if (!prevOverrides.displayTitle.isDirty) {
                clearError('displayTitle');
                newOverrides.displayTitle = {
                    ...prevOverrides.displayTitle,
                    value: newValue
                };
            }
            return newOverrides;
        });
    };

    const handleDisplayTitleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        updateForm(state => ({
            ...state,
            displayTitle: {
                ...state.displayTitle,
                isDirty: true,
                value: target.value
            }
        }));
    };

    const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        updateForm(state => ({
            ...state,
            displayDescription: target.value
        }));
    };

    const handleTrialAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        updateForm(state => ({
            ...state,
            trialAmount: Number(target.value)
        }));
    };

    const handleDurationChange = (duration: string) => {
        updateForm(state => ({
            ...state,
            duration: duration
        }));
    };

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        updateForm(state => ({
            ...state,
            code: {
                ...state.code,
                isDirty: true,
                value: target.value
            }
        }));
    };

    const cancelAddOffer = () => {
        if (allOffers.length > 0) {
            updateRoute('offers/edit');
        } else {
            updateRoute('offers');
        }
    };

    const overrides : offerPortalPreviewUrlTypes = useMemo(() => {
        return {
            name: formState.name || '',
            code: formState.code.value || '',
            displayTitle: formState.displayTitle.value || '',
            displayDescription: formState.displayDescription || '',
            type: formState.type || 'percent',
            cadence: formState.cadence || 'month',
            amount: calculateAmount(formState) || 0,
            duration: formState.type === 'trial' ? 'trial' : formState.duration || 'once',
            durationInMonths: formState.durationInMonths || 0,
            currency: formState.currency || 'USD',
            status: formState.status || 'active',
            tierId: formState.tierId || activeTiers[0]?.id,
            redemptionType: 'signup'
        };
    }, [formState, activeTiers]);

    useEffect(() => {
        const newHref = getOfferPortalPreviewUrl(overrides, siteData.url);
        setHref(newHref);
    }, [formState, siteData.url, formState.type, overrides]);

    const sidebar = <Sidebar
        amountOptions={amountOptions}
        clearError={clearError}
        durationOptions={durationOptions}
        errors={errors}
        handleAmountInput={handleAmountInput}
        handleAmountTypeChange={handleAmountTypeChange}
        handleCodeInput={handleCodeInput}
        handleDisplayTitleInput={handleDisplayTitleInput}
        handleDurationChange={handleDurationChange}
        handleDurationInMonthsInput={handleDurationInMonthsInput}
        handleNameInput={handleNameInput}
        handleTextAreaInput={handleTextAreaInput}
        handleTierChange={handleTierChange}
        handleTrialAmountInput={handleTrialAmountInput}
        handleTypeChange={handleTypeChange}
        overrides={formState}
        selectedTier={selectedTier.tier}
        testId='add-offer-sidebar'
        tierOptions={tierCadenceOptions}
        typeOptions={typeOptions}
        validate={validate}
    />;

    const iframe = <PortalFrame
        href={href || ''}
        portalParent='offers'
    />;
    return <PreviewModalContent
        afterClose={() => {
            updateRoute('offers');
        }}
        backDropClick={false}
        cancelLabel='Cancel'
        dirty={saveState === 'unsaved'}
        height='full'
        okLabel='Publish'
        okVariant={okProps.variant}
        preview={iframe}
        previewToolbar={false}
        sidebar={sidebar}
        size='lg'
        testId='add-offer-modal'
        title='Offer'
        width={1140}
        onCancel={cancelAddOffer}
        onOk={async () => {
            validate();
            const isErrorsEmpty = Object.values(errors).every(error => !error);
            if (!isErrorsEmpty) {
                toast.dismiss();
                toast.info('Can\'t save offer', {description: 'Make sure you filled all required fields'});
                return;
            }

            try {
                if (await handleSave({force: true})) {
                    return;
                }
            } catch (e) {
                let message;

                if (e instanceof JSONError && e.data && e.data.errors[0]) {
                    message = e.data.errors[0].context || e.data.errors[0].message;
                }

                toast.dismiss();
                if (message) {
                    toast.error('Can\'t save offer', {description: message || 'Please try again later'});
                }
            }
        }}
    />;
};

export default AddOfferModal;
