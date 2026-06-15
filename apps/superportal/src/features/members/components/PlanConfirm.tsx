/**
 * Plan-change confirmation screen. Presentational: shows the member's email,
 * the chosen plan + price, and when the change takes effect. The caller decides
 * the timing copy ("Starting today" for upgrades, "Starting {startDate}"
 * otherwise) and what onConfirm does.
 */

import {type ReactElement} from 'react';
import type {Services} from '../../../types';
import {cn} from '../../../shared/cn';
import {BackButton} from '../../../shared/components/buttons/BackButton';

interface Props {
    email: string;
    planName: string;
    priceLabel: string;
    timingLabel: string;
    onConfirm(): void;
    onBack(): void;
    loading: boolean;
    error?: string;
    t: Services['t'];
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

export function PlanConfirm({email, planName, priceLabel, timingLabel, onConfirm, onBack, loading, error, t}: Props): ReactElement {
    return (
        <div className="gh:relative">
            <BackButton onClick={onBack} t={t} disabled={loading} />

            <header className="gh:mb-6">
                <h1 className="gh:m-0 gh:text-[24px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{planName}</h1>
            </header>

            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">
                    {error}
                </div>
            )}

            <div className="gh:mb-6 gh:rounded-lg gh:border gh:border-[#dadee2] gh:p-4">
                <Row label={t('Account')} value={email} />
                <Row label={t('Price')} value={priceLabel} last />
            </div>

            <p className="gh:mb-5 gh:text-[14px] gh:text-[#3d3d3d]">{timingLabel}</p>

            <button type="button" disabled={loading} onClick={onConfirm} className={PRIMARY_BTN}>
                {t('Confirm')}
            </button>
        </div>
    );
}

function Row({label, value, last}: {label: string; value: string; last?: boolean}): ReactElement {
    return (
        <div className={cn('gh:flex gh:items-baseline gh:justify-between gh:gap-4', !last && 'gh:mb-3')}>
            <span className="gh:text-[13px] gh:text-[#7c8087]">{label}</span>
            <span className="gh:text-end gh:text-[14px] gh:font-medium gh:text-[#15171a]">{value}</span>
        </div>
    );
}
