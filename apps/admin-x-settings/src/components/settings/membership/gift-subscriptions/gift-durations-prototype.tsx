import React, {useState} from 'react';
import {Button, CurrencyField, Heading, Select, TextField} from '@tryghost/admin-x-design-system';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';

// EXPERIMENTAL / PROTOTYPE — an alternative to the fixed duration checkboxes.
// Instead of choosing from a preset list (1/3/6 months, 1 year), the publisher
// composes up to MAX_DURATIONS of their own (e.g. "2 months", "2 years") and the
// pricing re-derives live. State is local and NOT persisted — UX evaluation only.
const MAX_DURATIONS = 4;

interface EditableDuration {
    id: string;
    value: number;
    unit: 'month' | 'year';
}

const toMonths = (d: EditableDuration): number => (d.unit === 'year' ? d.value * 12 : d.value);

const durationLabel = (d: EditableDuration): string => {
    const noun = d.unit === 'year'
        ? (d.value === 1 ? 'year' : 'years')
        : (d.value === 1 ? 'month' : 'months');
    return `${d.value} ${noun}`;
};

const unitLabel = (unit: 'month' | 'year', value: number): string => {
    if (unit === 'year') {
        return value === 1 ? 'Year' : 'Years';
    }
    return value === 1 ? 'Month' : 'Months';
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
        ? {id: `seed-${i}`, value: m / 12, unit: 'year'}
        : {id: `seed-${i}`, value: m, unit: 'month'}
));

let idCounter = 0;
const nextId = () => `dur-${idCounter += 1}`;

const UNIT_OPTIONS = [
    {value: 'month', label: 'Months'},
    {value: 'year', label: 'Years'}
];

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
    const removeDuration = (id: string) => setDurations(list => list.filter(d => d.id !== id));
    const addDuration = () => {
        setDurations(list => (list.length >= MAX_DURATIONS ? list : [...list, {id: nextId(), value: 1, unit: 'month'}]));
    };

    // Per-tier, per-month-count price overrides (like the real gift_prices map).
    // Blank means "use the derived default".
    const [priceOverrides, setPriceOverrides] = useState<Record<string, Record<number, number>>>({});
    const setPrice = (tierId: string, months: number, cents: number) => {
        setPriceOverrides(prev => ({
            ...prev,
            [tierId]: {...(prev[tierId] || {}), [months]: cents}
        }));
    };

    const currency = tiers[0]?.currency || 'USD';
    const atMax = durations.length >= MAX_DURATIONS;

    return (
        <div>
            <div className='mb-1 flex items-center gap-2'>
                <Heading level={6}>Editable durations</Heading>
                <span className='rounded-sm bg-grey-200 px-1.5 py-0.5 text-2xs font-semibold tracking-wide text-grey-700 uppercase dark:bg-grey-900 dark:text-grey-500'>Prototype</span>
            </div>
            <p className='mt-1 text-sm text-grey-700'>Offer up to {MAX_DURATIONS} durations of your choosing — e.g. 2 months or 2 years. Pricing below updates as you edit them. Changes here aren&apos;t saved.</p>

            <div className='mt-4 flex flex-col gap-2'>
                {durations.map(d => (
                    <div key={d.id} className='flex items-center gap-2'>
                        <div className='w-16'>
                            <TextField
                                min={1}
                                type='number'
                                value={String(d.value)}
                                onChange={e => updateDuration(d.id, {value: Math.max(1, parseInt(e.target.value, 10) || 1)})}
                            />
                        </div>
                        <div className='w-32'>
                            <Select
                                options={UNIT_OPTIONS}
                                selectedOption={{value: d.unit, label: unitLabel(d.unit, d.value)}}
                                onSelect={option => option && updateDuration(d.id, {unit: option.value as 'month' | 'year'})}
                            />
                        </div>
                        <Button
                            color='grey'
                            disabled={durations.length <= 1}
                            icon='trash'
                            size='sm'
                            onClick={() => removeDuration(d.id)}
                        />
                    </div>
                ))}
            </div>

            <Button
                className='mt-3'
                color='green'
                disabled={atMax}
                icon='add'
                label={atMax ? 'Maximum of 4 durations' : 'Add duration'}
                size='sm'
                link
                onClick={addDuration}
            />

            <div className='mt-6'>
                <Heading level={6}>Pricing</Heading>
                <p className='mt-1 mb-4 text-sm text-grey-700'>Set a one-time price per duration, or leave blank to charge the default shown in grey. The fields track the durations above as you edit them.</p>
                {tiers.length === 0 && (
                    <p className='text-sm text-grey-600'>Add a paid tier to set pricing.</p>
                )}
                <div className='flex flex-col gap-6'>
                    {tiers.map(tier => (
                        <div key={tier.id}>
                            {tiers.length > 1 && <Heading className='mb-3' level={6}>{tier.name}</Heading>}
                            <div className='flex flex-col gap-3'>
                                {durations.map((d) => {
                                    const months = toMonths(d);
                                    return (
                                        <CurrencyField
                                            key={d.id}
                                            placeholder={String(derivedPriceInCents(tier, months) / 100)}
                                            rightPlaceholder={tier.currency || currency}
                                            title={durationLabel(d)}
                                            valueInCents={priceOverrides[tier.id]?.[months] ?? ''}
                                            onChange={cents => setPrice(tier.id, months, cents)}
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
