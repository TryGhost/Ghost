import React, {useState} from 'react';
import clsx from 'clsx';
import {Button} from '@tryghost/shade/components';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {Text} from '@tryghost/shade/primitives';
import {type TierFormState} from './tier-detail-modal';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';

interface TierDetailPreviewProps {
    tier: TierFormState;
    isFreeTier: boolean;
}

export const TrialDaysLabel: React.FC<{size?: 'sm' | 'md'; trialDays: number;}> = ({size = 'md', trialDays}) => {
    if (!trialDays) {
        return null;
    }

    const containerClassName = clsx(
        size === 'sm' ? 'px-1.5 py-0.5 text-sm' : 'px-2.5 py-1.5',
        'relative -mt-1 -mr-1 rounded-full leading-none font-semibold tracking-wide whitespace-nowrap text-grey-900'
    );

    return (
        <span className={containerClassName}>
            <span className="absolute inset-0 block rounded-full bg-ghostaccent opacity-20 dark:bg-pink"></span>
            <span className="dark:text-pink">{formatNumber(trialDays)} days free</span>
        </span>
    );
};

const TierBenefits: React.FC<{benefits: string[]}> = ({benefits}) => {
    if (!benefits?.length) {
        return (
            <div className="mt-4 w-full text-md leading-snug text-grey-900 opacity-30">
                <div className="mb-2.5 flex items-start">
                    <LucideIcon.Check className="mt-[3px] mr-[10px] size-3.5! min-w-[14px] overflow-visible stroke-[3px]!" />
                    <div>Expert analysis</div>
                </div>
            </div>
        );
    }
    const benefitOccurrences = new Map<string, number>();

    return (
        <>
            {
                benefits.map((benefit) => {
                    const occurrence = (benefitOccurrences.get(benefit) || 0) + 1;
                    benefitOccurrences.set(benefit, occurrence);

                    return (
                        <div key={`${benefit}:${occurrence}`} className="mt-4 w-full text-md leading-snug text-grey-900">
                            <div className="mb-2.5 flex items-start">
                                <LucideIcon.Check className="mt-[3px] mr-[10px] size-3.5! min-w-[14px] overflow-visible stroke-[3px]!" />
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
        <span className="mt-1 leading-none font-semibold text-ghostaccent">{formatNumber(discount)}% discount</span>
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
                <Text as='h6' className="pb-2 text-base" weight='semibold'>{isFreeTier ? 'Free membership preview' : 'Tier preview'}</Text>
                {!isFreeTier && <div className="flex gap-1">
                    <Button className={showingYearly ? 'h-auto p-0 text-muted-foreground' : 'h-auto p-0 text-foreground'} type='button' variant='link' onClick={() => setShowingYearly(false)}>Monthly</Button>
                    <Button className={showingYearly ? 'ml-2 h-auto p-0 text-foreground' : 'ml-2 h-auto p-0 text-muted-foreground'} type='button' variant='link' onClick={() => setShowingYearly(true)}>Yearly</Button>
                </div>}
            </div>
            <div className='rounded-sm border border-grey-200 bg-white dark:border-transparent'>
                <div className="flex-column relative flex min-h-[200px] w-full max-w-[420px] scale-90 items-start justify-stretch rounded bg-white p-4">
                    <div className="min-h-[56px] w-full">
                        <h4 className={`-mt-1 mb-0 w-full text-lg leading-tight font-semibold break-words text-ghostaccent ${!name && 'opacity-30'}`}>{name || (isFreeTier ? 'Free' : 'Bronze')}</h4>
                        <div className="mt-4 flex w-full flex-row flex-wrap items-end justify-between gap-x-1 gap-y-[10px]">
                            <div className={`flex flex-wrap text-black ${((showingYearly && tier?.yearly_price === undefined) || (!showingYearly && tier?.monthly_price === undefined)) && !isFreeTier ? 'opacity-30' : ''}`}>
                                <span className="self-start text-[2.7rem] leading-[1.115] font-bold uppercase">{currencySymbol}</span>
                                <span className="text-[3.4rem] leading-none font-bold tracking-tight break-all">{formatNumber(showingYearly ? yearlyPrice : monthlyPrice, {maximumFractionDigits: 20})}</span>
                                {!isFreeTier && <span className="ml-1 self-end text-[1.5rem] leading-snug text-grey-800">/{showingYearly ? 'year' : 'month'}</span>}
                            </div>
                            <TrialDaysLabel trialDays={trialDays} />
                        </div>
                        {(showingYearly && yearlyDiscount > 0) && <DiscountLabel discount={yearlyDiscount} />}
                    </div>
                    <div className="flex-column flex w-full flex-1">
                        <div className="flex-1">
                            <div className={`mt-4 w-full text-[1.55rem] leading-snug font-semibold text-grey-900 ${!description && 'opacity-30'}`}>{description || (isFreeTier ? `Free preview` : 'Full access to premium content')}</div>
                            <TierBenefits benefits={benefits} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierDetailPreview;
