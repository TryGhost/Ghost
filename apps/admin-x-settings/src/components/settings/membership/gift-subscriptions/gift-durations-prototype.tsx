import React, {useState} from 'react';
import useCurrencyInput from '../../../../hooks/use-currency-input';
import {Button, Field, FieldDescription, FieldLabel, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Plus, Trash2} from 'lucide-react';
import {Text} from '@tryghost/shade/primitives';
import {TextField} from '@tryghost/admin-x-design-system';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';

// EXPERIMENTAL / PROTOTYPE — an alternative to the fixed duration checkboxes.
// The publisher composes up to MAX_DURATIONS of their own (e.g. "2 months",
// "2 years"); each duration's price field shows the derived default as a grey
// placeholder and can be overridden, with a per-tier reset. NOT persisted.
const MAX_DURATIONS = 4;

interface EditableDuration {
    id: string;
    amount: string; // kept as a string so the field can be cleared while typing
    unit: 'month' | 'year';
}

// Empty / invalid input resolves to 1 only when we need a real number.
const parseAmount = (amount: string): number => Math.max(1, parseInt(amount, 10) || 1);

const toMonths = (d: EditableDuration): number => {
    const n = parseAmount(d.amount);
    return d.unit === 'year' ? n * 12 : n;
};

const durationLabel = (d: EditableDuration): string => {
    const n = parseAmount(d.amount);
    const noun = d.unit === 'year'
        ? (n === 1 ? 'year' : 'years')
        : (n === 1 ? 'month' : 'months');
    return `${n} ${noun}`;
};

const unitLabel = (unit: 'month' | 'year', amount: string): string => {
    const n = parseAmount(amount);
    if (unit === 'year') {
        return n === 1 ? 'Year' : 'Years';
    }
    return n === 1 ? 'Month' : 'Months';
};

// Mirrors getDerivedPriceInCents in gift-modal: whole-year durations anchor to
// the yearly price, everything else to the monthly price × months.
const derivedPriceInCents = (tier: Tier, months: number): number => (
    months % 12 === 0
        ? (tier.yearly_price || 0) * (months / 12)
        : (tier.monthly_price || 0) * months
);

// Convert stored month-counts into editable rows (12 → 1 year, etc.)
const fromMonths = (months: number[]): EditableDuration[] => months.map((m, i) => (
    m % 12 === 0
        ? {id: `seed-${i}`, amount: String(m / 12), unit: 'year'}
        : {id: `seed-${i}`, amount: String(m), unit: 'month'}
));

let idCounter = 0;
const nextId = () => `dur-${idCounter += 1}`;

const UNIT_OPTIONS = [
    {value: 'month', label: 'Months'},
    {value: 'year', label: 'Years'}
];

// A single currency input, wired to useCurrencyInput. Following Ghost's default
// convention, an empty field shows the derived default as a grey placeholder;
// typing sets an override; clearing it drops the override so the field falls
// back to the default again (never to 0). Because the hook re-syncs whenever
// valueInCents changes externally, clearing the override (or resetting a tier)
// visually empties the field with no remount trick.
const PriceField: React.FC<{
    title: string;
    placeholder: string;
    currency: string;
    valueInCents: number | '';
    onChange: (cents: number) => void;
}> = ({title, placeholder, currency, valueInCents, onChange}) => {
    const input = useCurrencyInput(valueInCents, onChange);
    return (
        <Field>
            <FieldLabel>{title}</FieldLabel>
            <InputGroup className='border-transparent bg-muted'>
                <InputGroupInput
                    inputMode='decimal'
                    placeholder={placeholder}
                    value={input.value}
                    onBlur={input.onBlur}
                    onChange={event => input.onChange(event.target.value)}
                />
                <InputGroupAddon align='inline-end'><InputGroupText>{currency}</InputGroupText></InputGroupAddon>
            </InputGroup>
        </Field>
    );
};

const GiftDurationsPrototype: React.FC<{
    initialMonths: number[];
    tiers: Tier[];
}> = ({initialMonths, tiers}) => {
    const [durations, setDurations] = useState<EditableDuration[]>(
        () => fromMonths(initialMonths.length ? initialMonths : [1, 12])
    );

    const updateDuration = (id: string, patch: Partial<EditableDuration>) => {
        setDurations(list => list.map(d => (d.id === id ? {...d, ...patch} : d)));
    };
    // On blur, normalise a blank/invalid amount back to a real number.
    const normaliseAmount = (id: string) => {
        setDurations(list => list.map(d => (d.id === id ? {...d, amount: String(parseAmount(d.amount))} : d)));
    };
    const removeDuration = (id: string) => setDurations(list => list.filter(d => d.id !== id));
    const addDuration = () => {
        setDurations(list => (list.length >= MAX_DURATIONS ? list : [...list, {id: nextId(), amount: '1', unit: 'month'}]));
    };

    // Per-tier, per-duration price overrides (in whole currency units). Typing
    // sets an override; clearing it drops the override. "Reset to default" drops
    // every override for the tier at once.
    const [priceOverrides, setPriceOverrides] = useState<Record<string, Record<string, string>>>({});
    const defaultPrice = (tier: Tier, d: EditableDuration): string => (
        (derivedPriceInCents(tier, toMonths(d)) / 100).toFixed(2)
    );
    const priceOverride = (tier: Tier, d: EditableDuration): string => (
        priceOverrides[tier.id]?.[d.id] ?? ''
    );
    const setPrice = (tierId: string, durationId: string, value: string) => {
        setPriceOverrides((prev) => {
            const tierPrices = {...(prev[tierId] || {})};
            if (value === '') {
                delete tierPrices[durationId];
            } else {
                tierPrices[durationId] = value;
            }
            return {...prev, [tierId]: tierPrices};
        });
    };
    const resetTierPrices = (tierId: string) => {
        setPriceOverrides((prev) => {
            const next = {...prev};
            delete next[tierId];
            return next;
        });
    };
    const tierHasOverrides = (tierId: string) => Object.keys(priceOverrides[tierId] || {}).length > 0;

    const currency = tiers[0]?.currency || 'USD';
    const atMax = durations.length >= MAX_DURATIONS;

    return (
        <div className='bg-grey-75 rounded-lg border border-dashed border-grey-300 p-5 dark:border-grey-800 dark:bg-grey-950'>
            <div className='mb-1 flex items-center gap-2'>
                <Text as='h5' className='text-base' weight='semibold'>Editable durations</Text>
                <span className='rounded-sm bg-grey-200 px-1.5 py-0.5 text-2xs font-semibold tracking-wide text-grey-700 uppercase dark:bg-grey-900 dark:text-grey-500'>Experimental</span>
            </div>
            <FieldDescription>An alternative to the fixed durations above — compose up to {MAX_DURATIONS} of your own (e.g. 2 months or 2 years). Changes here aren&apos;t saved.</FieldDescription>

            <div className='mt-4 flex flex-col gap-2'>
                {durations.map(d => (
                    <div key={d.id} className='flex items-center gap-2'>
                        <div className='w-16'>
                            <TextField
                                min={1}
                                type='number'
                                value={d.amount}
                                onBlur={() => normaliseAmount(d.id)}
                                onChange={e => updateDuration(d.id, {amount: e.target.value})}
                            />
                        </div>
                        <div className='w-32'>
                            <Select value={d.unit} onValueChange={value => updateDuration(d.id, {unit: value as 'month' | 'year'})}>
                                <SelectTrigger aria-label='Duration unit'>
                                    <SelectValue>{unitLabel(d.unit, d.amount)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIT_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            aria-label='Remove duration'
                            disabled={durations.length <= 1}
                            size='sm'
                            type='button'
                            variant='ghost'
                            onClick={() => removeDuration(d.id)}
                        >
                            <Trash2 />
                        </Button>
                    </div>
                ))}
            </div>

            <div className='mt-3 flex items-center gap-3'>
                <Button
                    disabled={atMax}
                    size='sm'
                    type='button'
                    variant='link'
                    onClick={addDuration}
                >
                    <Plus />Add duration
                </Button>
                {atMax && <FieldDescription className='!mt-0'>Maximum of {MAX_DURATIONS} durations</FieldDescription>}
            </div>

            <div className='mt-6'>
                <Text as='h5' className='text-base' weight='semibold'>Prototype pricing</Text>
                <FieldDescription className='mb-4 block'>Type to set your own price for any tier and duration, or reset a tier back to the defaults shown in grey.</FieldDescription>
                {tiers.length === 0 && (
                    <FieldDescription>Add a paid tier to set pricing.</FieldDescription>
                )}
                <div className='flex flex-col gap-6'>
                    {tiers.map(tier => (
                        <div key={tier.id}>
                            <div className={`mb-2 flex min-h-6 items-center ${tiers.length > 1 ? 'justify-between' : 'justify-end'}`}>
                                {tiers.length > 1 && <Text as='h6' className='text-base' weight='semibold'>{tier.name}</Text>}
                                <Button
                                    disabled={!tierHasOverrides(tier.id)}
                                    size='sm'
                                    type='button'
                                    variant='link'
                                    onClick={() => resetTierPrices(tier.id)}
                                >
                                    Reset to default
                                </Button>
                            </div>
                            <div className='flex flex-col gap-3'>
                                {durations.map((d) => {
                                    const override = priceOverride(tier, d);
                                    return (
                                        <PriceField
                                            key={`${tier.id}-${d.id}`}
                                            currency={tier.currency || currency}
                                            placeholder={defaultPrice(tier, d)}
                                            title={durationLabel(d)}
                                            valueInCents={override === '' ? '' : Math.round(parseFloat(override) * 100)}
                                            onChange={cents => setPrice(tier.id, d.id, cents ? String(cents / 100) : '')}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GiftDurationsPrototype;
