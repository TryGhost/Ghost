import React, {useState} from 'react';
import {Button, Heading} from '@tryghost/admin-x-design-system';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';

// EXPERIMENTAL / PROTOTYPE — an alternative to the fixed duration checkboxes.
// Instead of choosing from a preset list (1/3/6 months, 1 year), the publisher
// composes up to MAX_DURATIONS of their own (e.g. "2 months", "2 years"). The
// pricing preview re-derives live so the price↔duration relationship is obvious.
// State is local and NOT persisted — this is here to evaluate the UX only.
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

// Mirrors getDerivedPriceInCents in gift-modal: whole-year durations anchor to
// the yearly price, everything else to the monthly price × months.
const derivedPriceInCents = (tier: Tier, months: number): number => (
    months % 12 === 0
        ? (tier.yearly_price || 0) * (months / 12)
        : (tier.monthly_price || 0) * months
);

const formatPrice = (cents: number, currency: string): string => (
    new Intl.NumberFormat(undefined, {style: 'currency', currency, maximumFractionDigits: 2}).format(cents / 100)
);

// Convert stored month-counts into editable rows (12 → 1 year, etc.)
const fromMonths = (months: number[]): EditableDuration[] => months.map((m, i) => (
    m % 12 === 0
        ? {id: `seed-${i}`, value: m / 12, unit: 'year'}
        : {id: `seed-${i}`, value: m, unit: 'month'}
));

let idCounter = 0;
const nextId = () => `dur-${idCounter += 1}`;

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

    const currency = tiers[0]?.currency || 'USD';
    const atMax = durations.length >= MAX_DURATIONS;

    return (
        <div className='bg-grey-75 rounded-md border border-dashed border-grey-400 p-4'>
            <div className='mb-1 flex items-center justify-between'>
                <Heading level={6}>Editable durations</Heading>
                <span className='rounded-full bg-grey-200 px-2 py-0.5 text-xs font-medium text-grey-700'>Prototype · not saved</span>
            </div>
            <p className='mb-4 text-sm text-grey-700'>Offer up to {MAX_DURATIONS} durations of your choosing — e.g. 2 months or 2 years. Pricing updates automatically as you edit them.</p>

            <div className='flex flex-col gap-2'>
                {durations.map(d => (
                    <div key={d.id} className='flex items-center gap-2'>
                        <input
                            aria-label='Duration amount'
                            className='h-9 w-16 rounded-md border border-grey-300 bg-white px-2 text-sm'
                            min={1}
                            type='number'
                            value={d.value}
                            onChange={e => updateDuration(d.id, {value: Math.max(1, parseInt(e.target.value, 10) || 1)})}
                        />
                        <select
                            aria-label='Duration unit'
                            className='h-9 rounded-md border border-grey-300 bg-white px-2 text-sm'
                            value={d.unit}
                            onChange={e => updateDuration(d.id, {unit: e.target.value as 'month' | 'year'})}
                        >
                            <option value='month'>{d.value === 1 ? 'Month' : 'Months'}</option>
                            <option value='year'>{d.value === 1 ? 'Year' : 'Years'}</option>
                        </select>
                        <span className='text-sm text-grey-600'>= {toMonths(d)} {toMonths(d) === 1 ? 'month' : 'months'}</span>
                        <button
                            aria-label='Remove duration'
                            className='ml-auto px-2 text-grey-600 hover:text-red disabled:opacity-40'
                            disabled={durations.length <= 1}
                            type='button'
                            onClick={() => removeDuration(d.id)}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            <Button
                className='mt-3'
                disabled={atMax}
                label={atMax ? 'Maximum of 4 durations' : '+ Add duration'}
                link
                onClick={addDuration}
            />

            <div className='mt-5'>
                <Heading level={6}>Pricing preview</Heading>
                <p className='mt-1 mb-3 text-xs text-grey-700'>The default price for each duration, recalculated live.</p>
                {tiers.length === 0 && (
                    <p className='text-sm text-grey-600'>Add a paid tier to preview pricing.</p>
                )}
                {tiers.map(tier => (
                    <div key={tier.id} className='mb-4 last:mb-0'>
                        {tiers.length > 1 && <div className='mb-1 text-sm font-semibold'>{tier.name}</div>}
                        <div className='flex flex-col gap-1'>
                            {durations.map(d => (
                                <div key={d.id} className='flex items-center justify-between border-b border-grey-200 py-1 text-sm last:border-b-0'>
                                    <span className='text-grey-700'>{durationLabel(d)}</span>
                                    <span className='font-medium tabular-nums'>{formatPrice(derivedPriceInCents(tier, toMonths(d)), currency)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GiftDurationsPrototype;
