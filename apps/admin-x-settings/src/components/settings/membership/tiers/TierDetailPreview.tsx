import Button from '../../../../admin-x-ds/global/Button';
import Icon from '../../../../admin-x-ds/global/Icon';
import React, {useState} from 'react';
import {Tier} from '../../../../types/api';
import {getSymbol} from '../../../../utils/currency';

export type TierFormState = Partial<Omit<Tier, 'monthly_price' | 'yearly_price' | 'trial_days'>> & {
    monthly_price: string;
    yearly_price: string;
    trial_days: string;
};

interface TierDetailPreviewProps {
    tier: TierFormState
}

const TrialDaysLabel: React.FC<{trialDays: number}> = ({trialDays}) => {
    if (!trialDays) {
        return null;
    }
    return (
        <span className="relative -mr-1 -mt-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-semibold leading-none tracking-wide text-grey-900">
            <span className="absolute inset-0 block rounded-full bg-pink opacity-20"></span>
            {trialDays} days free
        </span>
    );
};

const TierBenefits: React.FC<{benefits: string[]}> = ({benefits}) => {
    if (!benefits?.length) {
        return null;
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

const TierDetailPreview: React.FC<TierDetailPreviewProps> = ({tier}) => {
    const [showingYearly, setShowingYearly] = useState(false);

    const name = tier?.name || '';
    const description = tier?.description || '';
    const trialDays = parseFloat(tier?.trial_days || '0');
    const currency = tier?.currency || 'USD';
    const currencySymbol = currency ? getSymbol(currency) : '$';
    const benefits = tier?.benefits || [];

    const monthlyPrice = parseFloat(tier?.monthly_price || '0');
    const yearlyPrice = parseFloat(tier?.yearly_price || '0');
    const yearlyDiscount = tier?.monthly_price && tier?.yearly_price
        ? Math.ceil(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
        : 0;

    return (
        <div className="-mt-[6px]">
            <div className="flex items-baseline justify-between">
                <h4 className="z-10 pb-3 text-2xs font-semibold uppercase tracking-wide text-grey-700">Tier preview</h4>
                <div className="flex">
                    <Button label="Monthly" onClick={() => setShowingYearly(false)} />
                    <Button label="Yearly" onClick={() => setShowingYearly(true)} />
                </div>
            </div>
            <div className="flex-column relative flex min-h-[200px] w-full max-w-[420px] items-start justify-stretch rounded border border-grey-200 bg-white p-8">
                <div className="min-h-[56px] w-full">
                    <h4 className="-mt-1 mb-0 w-full break-words text-lg font-semibold leading-tight text-pink">{name}</h4>
                    <div className="mt-4 flex w-full flex-row flex-wrap items-end justify-between gap-x-1 gap-y-[10px]">
                        <div className="flex flex-wrap text-black">
                            <span className="self-start text-[2.7rem] font-bold uppercase leading-[1.115]">{currencySymbol}</span>
                            <span className="break-all text-[3.4rem] font-bold leading-none tracking-tight">{showingYearly ? yearlyPrice : monthlyPrice}</span>
                            <span className="ml-1 self-end text-[1.5rem] leading-snug text-grey-800">/{showingYearly ? 'year' : 'month'}</span>
                        </div>
                        <TrialDaysLabel trialDays={trialDays} />
                    </div>
                    {(showingYearly && yearlyDiscount > 0) && <DiscountLabel discount={yearlyDiscount} />}
                </div>
                <div className="flex-column flex w-full flex-1">
                    <div className="flex-1">
                        <div className="mt-4 w-full text-[1.55rem] font-semibold leading-snug text-grey-900">{description}</div>
                        <TierBenefits benefits={benefits} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierDetailPreview;
