import React from 'react';
import WarningCircleFilledIcon from '../../../assets/icons/kg-warning-circle-filled.svg?react';

export type PublicPreviewVisibility = 'public' | 'members' | 'paid' | 'tiers';

export interface PublicPreviewTier {
    active?: boolean;
    id: string;
    name: string;
    slug: string;
}

interface PaywallCardProps {
    availableTiers?: PublicPreviewTier[];
    canChangeAccess?: boolean;
    error?: string | null;
    isLoadingTiers?: boolean;
    isSaving?: boolean;
    onApplyTiers?: () => void;
    onChangeAccess?: () => void;
    onSelectAccess?: (visibility: PublicPreviewVisibility) => void;
    onToggleTier?: (tierId: string) => void;
    selectedTierIds?: string[];
    showAccessEditor?: boolean;
    showPaidAccess?: boolean;
    showPlacementWarning?: boolean;
    showTierSelector?: boolean;
    visibility?: PublicPreviewVisibility;
    visibilityLabel?: string;
}

const accessButtonClass = 'min-h-[32px] rounded border border-grey-300 bg-white px-3 py-1.5 text-sm font-semibold text-grey-800 transition-colors hover:border-grey-500 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-grey-700 dark:bg-grey-950 dark:text-grey-300 dark:hover:border-grey-500 dark:hover:text-white dark:focus-visible:ring-offset-black';
const selectedAccessButtonClass = '!border-green !bg-green-100 !text-green-600 hover:!border-green hover:!text-green-600 dark:!border-green dark:!bg-green/10 dark:!text-green';

function AccessButton({children, isSelected, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {isSelected?: boolean}) {
    return (
        <button
            aria-pressed={isSelected}
            className={`${accessButtonClass} ${isSelected ? selectedAccessButtonClass : ''}`}
            type="button"
            {...props}
        >
            {children}
        </button>
    );
}

export function PaywallCard({
    availableTiers = [],
    canChangeAccess = false,
    error,
    isLoadingTiers = false,
    isSaving = false,
    onApplyTiers,
    onChangeAccess,
    onSelectAccess,
    onToggleTier,
    selectedTierIds = [],
    showAccessEditor = false,
    showPaidAccess = true,
    showPlacementWarning = false,
    showTierSelector = false,
    visibility = 'members',
    visibilityLabel = 'members'
}: PaywallCardProps) {
    const isUnresolved = visibility === 'public';
    const placementWarningId = React.useId();
    const resolvedAccessLabel = visibility === 'members'
        ? 'Members only'
        : visibility === 'paid'
            ? 'Paid-members only'
            : visibilityLabel === 'specific tiers' ? 'Specific tiers' : visibilityLabel;

    return (
        <div
            className="not-kg-prose relative w-full font-sans"
            data-kg-public-preview-unresolved={isUnresolved ? 'true' : undefined}
        >
            {showPlacementWarning ? (
                <button
                    aria-describedby={placementWarningId}
                    aria-label="Public preview warning"
                    className="group absolute -right-14 -top-1 z-20 flex size-7 items-center justify-center rounded-full text-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                    data-kg-allow-clickthrough="true"
                    data-testid="public-preview-placement-warning-indicator"
                    type="button"
                >
                    <WarningCircleFilledIcon aria-hidden="true" className="size-5" />
                    <span
                        className="pointer-events-none invisible absolute bottom-full left-1/2 mb-2 w-72 -translate-x-1/2 translate-y-1 rounded-md bg-black px-3 py-2 text-left text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition-[opacity,transform,visibility] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100 dark:bg-grey-900"
                        id={placementWarningId}
                        role="tooltip"
                    >
                        The public preview is at the beginning of this post, so visitors won’t see any free content.
                    </span>
                </button>
            ) : null}
            {!showAccessEditor ? (
                <div className="flex h-5 w-full items-center justify-center gap-2 whitespace-nowrap text-center text-sm text-grey-600 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:flex-1 after:border-t after:border-grey-300 after:content-[''] dark:text-grey-500 dark:before:border-grey-700 dark:after:border-grey-700">
                    <span className="flex items-center gap-1">
                        <span className="font-medium">Visible to everyone</span>
                        <span aria-hidden="true" className="text-sm font-semibold leading-none text-green">↑</span>
                    </span>
                    <span aria-hidden="true">/</span>
                    <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="text-sm font-semibold leading-none text-green">↓</span>
                        <span className="font-medium">{resolvedAccessLabel}</span>
                    </span>
                    {canChangeAccess ? (
                        <button
                            className="relative rounded p-0 font-normal text-green underline decoration-1 underline-offset-2 before:absolute before:-inset-2 before:content-[''] hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                            data-kg-allow-clickthrough="true"
                            type="button"
                            onClick={onChangeAccess}
                        >
                            Change access
                        </button>
                    ) : null}
                </div>
            ) : (
                <>
                    <div className="flex h-4 items-center whitespace-pre text-center text-2xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-grey-300 after:content-[''] dark:text-grey-600 dark:before:border-grey-700 dark:after:border-grey-700">
                        Public preview
                        {isUnresolved ? <span className="ml-2 text-yellow-600">Inactive</span> : null}
                    </div>
                    <div
                        className="mx-auto mt-2 flex max-w-[560px] flex-col items-center gap-3 px-4 text-center"
                        data-kg-allow-clickthrough="true"
                    >
                        <p className="!m-0 max-w-[58ch] font-serif text-xl leading-[1.6] text-grey-600 dark:text-grey-500">
                            {isUnresolved
                                ? 'This post is public, so everyone can read it in full. Who should be able to read beyond this preview?'
                                : `Content beyond this preview is currently visible to ${visibilityLabel}. Who should be able to read it?`}
                        </p>

                        {canChangeAccess ? (
                            <div aria-label="Post access below public preview" className="flex flex-wrap justify-center gap-2" role="group">
                                <AccessButton
                                    data-kg-public-preview-access-option="members"
                                    disabled={isSaving}
                                    isSelected={visibility === 'members' && !showTierSelector}
                                    onClick={() => onSelectAccess?.('members')}
                                >
                                    Members only
                                </AccessButton>
                                {showPaidAccess ? (
                                    <AccessButton
                                        data-kg-public-preview-access-option="paid"
                                        disabled={isSaving}
                                        isSelected={visibility === 'paid' && !showTierSelector}
                                        onClick={() => onSelectAccess?.('paid')}
                                    >
                                        Paid-members only
                                    </AccessButton>
                                ) : null}
                                {showPaidAccess ? (
                                    <AccessButton
                                        data-kg-public-preview-access-option="tiers"
                                        disabled={isSaving}
                                        isSelected={visibility === 'tiers' || showTierSelector}
                                        onClick={() => onSelectAccess?.('tiers')}
                                    >
                                        Specific tiers
                                    </AccessButton>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm text-grey-600 dark:text-grey-500">Ask an editor or administrator to change this post’s access.</p>
                        )}

                        {showTierSelector ? (
                            <fieldset className="flex w-full max-w-[520px] flex-col items-center gap-2 text-left">
                                <legend className="sr-only">Choose tiers</legend>
                                {isLoadingTiers ? <p className="text-center text-sm text-grey-600 dark:text-grey-500">Loading tiers…</p> : null}
                                {!isLoadingTiers && availableTiers.length === 0 ? (
                                    <p className="text-center text-sm text-grey-600 dark:text-grey-500">No paid tiers are available.</p>
                                ) : null}
                                {availableTiers.length > 0 ? (
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        {availableTiers.map(tier => (
                                            <label key={tier.id} className="flex min-h-[32px] cursor-pointer items-center gap-2 rounded px-2 text-sm text-grey-800 hover:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-900">
                                                <input
                                                    checked={selectedTierIds.includes(tier.id)}
                                                    className="size-4 accent-green"
                                                    disabled={isSaving}
                                                    type="checkbox"
                                                    onChange={() => onToggleTier?.(tier.id)}
                                                />
                                                <span>{tier.name}</span>
                                                {tier.active === false ? <span className="text-xs text-grey-500">Archived</span> : null}
                                            </label>
                                        ))}
                                    </div>
                                ) : null}
                                {availableTiers.length > 0 ? (
                                    <button
                                        className="mt-1 min-h-[36px] self-center rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-grey-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-grey-200 dark:focus-visible:ring-offset-black"
                                        disabled={selectedTierIds.length === 0 || isSaving}
                                        type="button"
                                        onClick={onApplyTiers}
                                    >
                                        Apply tier access
                                    </button>
                                ) : null}
                            </fieldset>
                        ) : null}

                        {error ? <p className="text-sm text-red" role="alert">{error}</p> : null}
                    </div>
                </>
            )}
        </div>
    );
}
