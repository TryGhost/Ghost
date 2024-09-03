import React, {useState} from 'react';
import clsx from 'clsx';
import {Button, Heading, Icon} from '@tryghost/admin-x-design-system';
import {TierFormState} from './TierDetailModal';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {numberWithCommas} from '../../../../utils/helpers';

interface TierDetailPreviewProps {
    tier: TierFormState;
    isFreeTier: boolean;
}

export const TrialDaysLabel: React.FC<{size?: 'sm' | 'md'; trialDays: number;}> = ({size = 'md', trialDays}) => {
    if (!trialDays) {
        return null;
    }

    const containerClassName = clsx(
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1.5 text-sm',
        'relative -mr-1 -mt-1 whitespace-nowrap rounded-full font-semibold leading-none tracking-wide text-grey-900'
    );

    return (
        <span className={containerClassName}>
            <span className="absolute inset-0 block rounded-full bg-accent opacity-20 dark:bg-pink"></span>
            <span className="dark:text-pink">{trialDays} days free</span>
        </span>
    );
};

const TierBenefits: React.FC<{benefits: string[]}> = ({benefits}) => {
    if (!benefits?.length) {
        return (
            <div className="mt-4 w-full text-md leading-snug text-grey-900 opacity-30">
                <div className="mb-2.5 flex items-start">
                    <Icon className="mr-[10px] mt-[3px] !h-3.5 !w-3.5 min-w-[14px] overflow-visible !stroke-[3px]" name='check' />
                    <div>Expert analysis</div>
                </div>
            </div>
        );
    }
    return (
        <>
            {
                benefits.map((benefit) => {
                    return (
                        <div key={benefit} className="mt-4 w-full text-md leading-snug text-grey-900">
                            <div className="mb-2.5 flex items-start">
                                <Icon className="mr-[10px] mt-[3px] !h-3.5 !w-3.5 min-w-[14px] overflow-visible !stroke-[3px]" name='check' />
                                <div>{benefit}</div>
                            </div>
                        </div>
                    );
                })
            }
        </>
    );
};

const DiscountLabel: React.FC<{discount: number}> = ({discount}) => {
    if (!discount) {
        return null;
    }
    return (
        <span className="mt-1 text-sm font-semibold leading-none text-pink">{discount}% discount</span>
    );
};

const TierDetailPreview: React.FC<TierDetailPreviewProps> = ({tier, isFreeTier}) => {
    const [showingYearly, setShowingYearly] = useState(false);

    const name = tier?.name || '';
    const description = tier?.description || '';
    const trialDays = parseFloat(tier?.trial_days || '0');
    const currency = tier?.currency || 'USD';
    const currencySymbol = currency ? getSymbol(currency) : '$';
    const benefits = tier?.benefits || [];

    const defaultMonthlyPrice = isFreeTier ? 0 : 500;
    const defaultYearlyPrice = isFreeTier ? 0 : 5000;
    const monthlyPrice = currencyToDecimal(tier?.monthly_price ?? defaultMonthlyPrice);
    const yearlyPrice = currencyToDecimal(tier?.yearly_price ?? defaultYearlyPrice);
    const yearlyDiscount = tier?.monthly_price && tier?.yearly_price
        ? Math.ceil(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
        : 0;

    return (
        <div data-testid="tier-preview">
            <div className="flex items-baseline justify-between">
                <Heading className="pb-2" level={6} grey>{isFreeTier ? 'Free membership preview' : 'Tier preview'}</Heading>
                {!isFreeTier && <div className="flex gap-1">
                    <Button className={`${showingYearly === true ? 'text-grey-500' : 'text-grey-900 dark:text-white'}`} label="Monthly" link unstyled onClick={() => setShowingYearly(false)} />
                    <Button className={`ml-2 ${showingYearly === true ? 'text-grey-900 dark:text-white' : 'text-grey-500'}`} label="Yearly" link unstyled onClick={() => setShowingYearly(true)} />
                </div>}
            </div>
            <div className='rounded-sm border border-grey-200 bg-white dark:border-transparent'>
                <div className="flex-column relative flex min-h-[200px] w-full max-w-[420px] scale-90 items-start justify-stretch rounded bg-white p-4">
                    <div className="min-h-[56px] w-full">
                        <h4 className={`-mt-1 mb-0 w-full break-words text-lg font-semibold leading-tight text-accent ${!name && 'opacity-30'}`}>{name || (isFreeTier ? 'Free' : 'Bronze')}</h4>
                        <div className="mt-4 flex w-full flex-row flex-wrap items-end justify-between gap-x-1 gap-y-[10px]">
                            <div className={`flex flex-wrap text-black ${((showingYearly && tier?.yearly_price === undefined) || (!showingYearly && tier?.monthly_price === undefined)) && !isFreeTier ? 'opacity-30' : ''}`}>
                                <span className="self-start text-[2.7rem] font-bold uppercase leading-[1.115]">{currencySymbol}</span>
                                <span className="break-all text-[3.4rem] font-bold leading-none tracking-tight">{showingYearly ? numberWithCommas(yearlyPrice) : numberWithCommas(monthlyPrice)}</span>
                                {!isFreeTier && <span className="ml-1 self-end text-[1.5rem] leading-snug text-grey-800">/{showingYearly ? 'year' : 'month'}</span>}
                            </div>
                            <TrialDaysLabel trialDays={trialDays} />
                        </div>
                        {(showingYearly && yearlyDiscount > 0) && <DiscountLabel discount={yearlyDiscount} />}
                    </div>
                    <div className="flex-column flex w-full flex-1">
                        <div className="flex-1">
                            <div className={`mt-4 w-full text-[1.55rem] font-semibold leading-snug text-grey-900 ${!description && 'opacity-30'}`}>{description || (isFreeTier ? `Free preview` : 'Full access to premium content')}</div>
                            <TierBenefits benefits={benefits} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierDetailPreview;
