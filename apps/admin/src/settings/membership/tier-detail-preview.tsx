import { useState } from "react";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { currencyToDecimal, getSymbol } from "@tryghost/admin-x-settings/src/utils/currency";

import type { TierFormState } from "./tier-detail-dialog";

/**
 * The live tier preview beside the tier detail form, ported from the legacy
 * tier-detail-preview.tsx. TrialDaysLabel is shared with the tier cards grid
 * (the legacy pill, rebuilt on semantic tokens).
 */

export function TrialDaysLabel({ size = "md", trialDays }: { size?: "sm" | "md"; trialDays: number }) {
    if (!trialDays) {
        return null;
    }

    return (
        <span className={cn(
            size === "sm" ? "px-1.5 py-0.5 text-sm" : "px-2.5 py-1.5",
            "relative -mt-1 -mr-1 rounded-full leading-none font-semibold tracking-wide whitespace-nowrap text-foreground",
        )}>
            <span className="absolute inset-0 block rounded-full bg-ghostaccent opacity-20"></span>
            <span>{trialDays} days free</span>
        </span>
    );
}

function TierBenefits({ benefits }: { benefits: string[] }) {
    if (!benefits?.length) {
        return (
            <div className="mt-4 w-full text-md leading-snug text-gray-900 opacity-30">
                <div className="mb-2.5 flex items-start">
                    <LucideIcon.Check className="mt-[3px] mr-[10px] size-3.5 min-w-[14px] stroke-3" />
                    <div>Expert analysis</div>
                </div>
            </div>
        );
    }
    return (
        <>
            {benefits.map((benefit) => (
                <div key={benefit} className="mt-4 w-full text-md leading-snug text-gray-900">
                    <div className="mb-2.5 flex items-start">
                        <LucideIcon.Check className="mt-[3px] mr-[10px] size-3.5 min-w-[14px] stroke-3" />
                        <div>{benefit}</div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function TierDetailPreview({ tier, isFreeTier }: { tier: TierFormState; isFreeTier: boolean }) {
    const [showingYearly, setShowingYearly] = useState(false);

    const name = tier?.name || "";
    const description = tier?.description || "";
    const trialDays = parseFloat(tier?.trial_days || "0");
    const currency = tier?.currency || "USD";
    const currencySymbol = currency ? getSymbol(currency) : "$";
    const benefits = tier?.benefits || [];

    const defaultMonthlyPrice = isFreeTier ? 0 : 500;
    const defaultYearlyPrice = isFreeTier ? 0 : 5000;
    const monthlyPrice = currencyToDecimal(tier?.monthly_price ?? defaultMonthlyPrice);
    const yearlyPrice = currencyToDecimal(tier?.yearly_price ?? defaultYearlyPrice);
    const yearlyDiscount = tier?.monthly_price && tier?.yearly_price
        ? Math.ceil(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
        : 0;

    const formatPrice = (price: number) => formatNumber(price, { maximumFractionDigits: 2 });

    return (
        <div data-testid="tier-preview">
            <div className="flex items-baseline justify-between">
                <h6 className="pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{isFreeTier ? "Free membership preview" : "Tier preview"}</h6>
                {!isFreeTier && (
                    <div className="flex gap-1">
                        <button className={cn("cursor-pointer", showingYearly ? "text-muted-foreground" : "text-foreground")} type="button" onClick={() => setShowingYearly(false)}>Monthly</button>
                        <button className={cn("ml-2 cursor-pointer", showingYearly ? "text-foreground" : "text-muted-foreground")} type="button" onClick={() => setShowingYearly(true)}>Yearly</button>
                    </div>
                )}
            </div>
            {/* The card mirrors what Portal renders, so it stays white in both themes. */}
            <div className="rounded-sm border border-gray-200 bg-white">
                <div className="flex-column relative flex min-h-[200px] w-full max-w-[420px] scale-90 items-start justify-stretch rounded bg-white p-4">
                    <div className="min-h-[56px] w-full">
                        <h4 className={cn("-mt-1 mb-0 w-full text-lg leading-tight font-semibold break-words text-ghostaccent", !name && "opacity-30")}>{name || (isFreeTier ? "Free" : "Bronze")}</h4>
                        <div className="mt-4 flex w-full flex-row flex-wrap items-end justify-between gap-x-1 gap-y-[10px]">
                            <div className={cn("flex flex-wrap text-black", ((showingYearly && tier?.yearly_price === undefined) || (!showingYearly && tier?.monthly_price === undefined)) && !isFreeTier && "opacity-30")}>
                                <span className="self-start text-[2.7rem] leading-[1.115] font-bold uppercase">{currencySymbol}</span>
                                <span className="text-[3.4rem] leading-none font-bold tracking-tight break-all">{showingYearly ? formatPrice(yearlyPrice) : formatPrice(monthlyPrice)}</span>
                                {!isFreeTier && <span className="ml-1 self-end text-[1.5rem] leading-snug text-gray-800">/{showingYearly ? "year" : "month"}</span>}
                            </div>
                            <TrialDaysLabel trialDays={trialDays} />
                        </div>
                        {(showingYearly && yearlyDiscount > 0) && (
                            <span className="mt-1 leading-none font-semibold text-ghostaccent">{yearlyDiscount}% discount</span>
                        )}
                    </div>
                    <div className="flex-column flex w-full flex-1">
                        <div className="flex-1">
                            <div className={cn("mt-4 w-full text-[1.55rem] leading-snug font-semibold text-gray-900", !description && "opacity-30")}>{description || (isFreeTier ? "Free preview" : "Full access to premium content")}</div>
                            <TierBenefits benefits={benefits} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
