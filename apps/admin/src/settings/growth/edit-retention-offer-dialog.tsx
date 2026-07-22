import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import { type Offer, useAddOffer, useBrowseOffers, useEditOffer, useInvalidateOffers } from "@tryghost/admin-x-framework/api/offers";
import { getPaidActiveTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";
import { getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes } from "@tryghost/admin-x-settings/src/utils/get-offers-portal-preview-url";
import { createOfferRedemptionsFilterUrl, formatOfferTimestamp, generateRetentionOfferName } from "@tryghost/admin-x-settings/src/components/settings/growth/offers/offer-helpers";

import { OffersBreadcrumbs } from "./offers-breadcrumbs";
import { PortalFrame } from "@/settings/membership/portal-frame";
import { type PreviewDevice, PreviewDialog } from "@/settings/site/preview-chrome";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast } from "@/settings/app/shared/toast";

/**
 * The routed retention-offer dialog
 * (`/settings/offers/edit/retention/:cadence`), ported from the legacy
 * offers/edit-retention-offer-modal.tsx: terms changes create a new
 * retention offer (archiving the active one), display-only changes edit it
 * in place, and disabling archives it.
 */

type RetentionOfferFormState = {
    enabled: boolean;
    displayTitle: string;
    displayDescription: string;
    type: "percent" | "free_months";
    percentAmount: number;
    duration: string;
    durationInMonths: number;
    freeMonths: number;
};

const typeOptions = [
    { title: "Percentage discount", description: "Offer a special reduced price", value: "percent" },
    { title: "Free month(s)", description: "Give free access for a limited time", value: "free_months" },
];

const durationOptions = [
    { value: "once", label: "First-payment" },
    { value: "repeating", label: "Multiple-months" },
    { value: "forever", label: "Forever" },
];

const MAX_DISPLAY_TEXT_LENGTH = 191;
const MAX_RETENTION_OFFER_MONTHS = 99;
const RETENTION_MONTHS_ERROR_MESSAGE = `Enter a whole number of months between 1 and ${MAX_RETENTION_OFFER_MONTHS}.`;

type RetentionOfferTerms = {
    type: "percent";
    amount: number;
    duration: string;
    durationInMonths: number;
};

const normalizeDurationInMonths = (value: number): number => {
    const parsedValue = Number.isFinite(value) ? Math.trunc(value) : 0;
    return Math.max(1, parsedValue);
};

const getResolvedAmount = ({
    type,
    percentAmount,
    freeMonths,
    lastPercentAmount,
    lastFreeMonths,
}: {
    type: "percent" | "free_months";
    percentAmount: number;
    freeMonths: number;
    lastPercentAmount: number;
    lastFreeMonths: number;
}) => {
    if (type === "free_months") {
        return freeMonths > 0 ? freeMonths : lastFreeMonths;
    }

    return percentAmount > 0 ? percentAmount : lastPercentAmount;
};

const getDefaultState = (cadence: "monthly" | "yearly" = "monthly"): RetentionOfferFormState => {
    return {
        enabled: false,
        displayTitle: "",
        displayDescription: "",
        type: cadence === "yearly" ? "percent" : "free_months",
        percentAmount: 20,
        duration: "once",
        durationInMonths: 1,
        freeMonths: 1,
    };
};

const isFreeMonthsPattern = (offer: Offer): boolean => {
    return offer.type === "percent" && offer.amount === 100 && offer.duration === "repeating";
};

const getRetentionOfferFormState = (offer: Offer | null, cadence: "monthly" | "yearly" = "monthly"): RetentionOfferFormState => {
    const defaultState = getDefaultState(cadence);

    if (!offer) {
        return defaultState;
    }

    const isFreeMonths = isFreeMonthsPattern(offer);
    const isPercentOffer = offer.type === "percent" && !isFreeMonths;
    const repeatingDurationInMonths = offer.duration === "repeating" && offer.duration_in_months ? offer.duration_in_months : defaultState.durationInMonths;

    return {
        enabled: offer.status === "active",
        displayTitle: offer.display_title || "",
        displayDescription: offer.display_description || "",
        type: isFreeMonths ? "free_months" : "percent",
        percentAmount: isPercentOffer ? offer.amount : defaultState.percentAmount,
        duration: isPercentOffer ? offer.duration : defaultState.duration,
        durationInMonths: repeatingDurationInMonths,
        freeMonths: isFreeMonths ? (offer.duration_in_months || defaultState.freeMonths) : defaultState.freeMonths,
    };
};

const getFormOfferTerms = ({
    formState,
    lastPercentAmount,
    lastFreeMonths,
}: {
    formState: RetentionOfferFormState;
    lastPercentAmount: number;
    lastFreeMonths: number;
}): RetentionOfferTerms => {
    const amount = getResolvedAmount({
        type: formState.type,
        percentAmount: formState.percentAmount,
        freeMonths: formState.freeMonths,
        lastPercentAmount,
        lastFreeMonths,
    });

    if (formState.type === "free_months") {
        return {
            type: "percent",
            amount: 100,
            duration: "repeating",
            durationInMonths: normalizeDurationInMonths(amount),
        };
    }

    const duration = formState.duration;
    const durationInMonths = duration === "repeating" ? normalizeDurationInMonths(formState.durationInMonths) : 0;

    return {
        type: "percent",
        amount,
        duration,
        durationInMonths,
    };
};

const getOfferTerms = (offer: Offer | null): RetentionOfferTerms | null => {
    if (!offer) {
        return null;
    }

    // A free months offer is stored as percent/100/repeating
    // but getFormOfferTerms also returns percent/100/repeating for free_months form type
    // so terms comparison works correctly without special-casing
    const durationInMonths = offer.duration_in_months ?? 0;

    return {
        type: "percent",
        amount: offer.amount,
        duration: offer.duration,
        durationInMonths,
    };
};

const getTermsSignature = (terms: RetentionOfferTerms | null): string => {
    if (!terms) {
        return "";
    }

    return `${terms.type}:${terms.amount}:${terms.duration}:${terms.durationInMonths}`;
};

const isValidMonthDuration = (value: number): boolean => {
    return Number.isInteger(value) && value > 0 && value <= MAX_RETENTION_OFFER_MONTHS;
};

const hasFormChangesFromDefault = (formState: RetentionOfferFormState, defaultState: RetentionOfferFormState): boolean => {
    return formState.displayTitle !== defaultState.displayTitle ||
        formState.displayDescription !== defaultState.displayDescription ||
        formState.type !== defaultState.type ||
        formState.percentAmount !== defaultState.percentAmount ||
        formState.duration !== defaultState.duration ||
        formState.durationInMonths !== defaultState.durationInMonths ||
        formState.freeMonths !== defaultState.freeMonths;
};

function RetentionOfferSidebar({ formState, updateForm, clearError, errors, cadence, lastRedeemed, membersFilterUrl, redemptions }: {
    formState: RetentionOfferFormState;
    updateForm: (updater: (state: RetentionOfferFormState) => RetentionOfferFormState) => void;
    clearError: (field: string) => void;
    errors: ErrorMessages;
    cadence: "monthly" | "yearly";
    lastRedeemed?: string | null;
    membersFilterUrl?: string | null;
    redemptions: number;
}) {
    const availableDurationOptions = cadence === "yearly"
        ? durationOptions.filter((option) => option.value !== "repeating")
        : durationOptions;

    return (
        <div className="flex grow flex-col gap-6 pt-2">
            <section>
                <div className="flex flex-col gap-5 rounded-md border border-border p-4 pb-3.5">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm leading-none font-semibold text-muted-foreground">Performance</span>
                                <span>{formatNumber(redemptions)} {redemptions === 1 ? "redemption" : "redemptions"}</span>
                            </div>
                            {redemptions > 0 && lastRedeemed ? (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm leading-none font-semibold text-muted-foreground">Last redemption</span>
                                    <span>{formatOfferTimestamp(lastRedeemed)}</span>
                                </div>
                            ) : null}
                        </div>
                        {redemptions > 0 && membersFilterUrl ? <a className="font-semibold text-primary" href={membersFilterUrl}>See members &rarr;</a> : null}
                    </div>
                </div>
            </section>
            <section>
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor={`${cadence}-retention-enabled`}>Enable {cadence} retention</FieldLabel>
                        <FieldDescription>{cadence === "monthly" ? "Applied to monthly plans" : "Applied to annual plans"}</FieldDescription>
                    </FieldContent>
                    <Switch
                        checked={formState.enabled}
                        id={`${cadence}-retention-enabled`}
                        onCheckedChange={(checked) => updateForm((state) => ({ ...state, enabled: checked }))}
                    />
                </Field>
            </section>
            {formState.enabled && (
                <>
                    <section>
                        <h2 className="mb-4 text-lg font-semibold tracking-tight">General</h2>
                        <div className="flex flex-col gap-6">
                            <TextField
                                maxLength={MAX_DISPLAY_TEXT_LENGTH}
                                placeholder="Before you go"
                                title="Display title"
                                value={formState.displayTitle}
                                onChange={(e) => {
                                    updateForm((state) => ({ ...state, displayTitle: e.target.value }));
                                }}
                            />
                            <Field>
                                <FieldLabel htmlFor="retention-display-description">Display description</FieldLabel>
                                <Textarea
                                    className="border-transparent bg-muted"
                                    id="retention-display-description"
                                    maxLength={MAX_DISPLAY_TEXT_LENGTH}
                                    placeholder="We&#39;d hate to see you leave. How about a special offer to stay?"
                                    value={formState.displayDescription}
                                    onChange={(e) => {
                                        updateForm((state) => ({ ...state, displayDescription: e.target.value }));
                                    }}
                                />
                            </Field>
                        </div>
                    </section>
                    <section className="mt-2">
                        <h2 className="mb-4 text-lg font-semibold tracking-tight">Details</h2>
                        <div className="flex flex-col gap-6">
                            {cadence === "monthly" && (
                                <RadioGroup
                                    aria-label={`${cadence} retention offer type`}
                                    className="rounded-md border border-border p-4"
                                    value={formState.type}
                                    onValueChange={(value) => {
                                        clearError("amount");
                                        clearError("durationInMonths");
                                        updateForm((state) => ({ ...state, type: value as RetentionOfferFormState["type"] }));
                                    }}
                                >
                                    {typeOptions.map((option) => {
                                        const id = `${cadence}-retention-type-${option.value}`;
                                        return (
                                            <Field key={option.value} orientation="horizontal">
                                                <RadioGroupItem id={id} indicator="check" value={option.value} />
                                                <FieldContent>
                                                    <FieldLabel className="cursor-pointer" htmlFor={id}>{option.title}</FieldLabel>
                                                    <FieldDescription>{option.description}</FieldDescription>
                                                </FieldContent>
                                            </Field>
                                        );
                                    })}
                                </RadioGroup>
                            )}
                            {formState.type === "percent" && (
                                <>
                                    <TextField
                                        error={Boolean(errors.amount)}
                                        hint={errors.amount}
                                        rightAddon="%"
                                        title="Amount off"
                                        type="number"
                                        value={formState.percentAmount === 0 ? "" : String(formState.percentAmount)}
                                        onChange={(e) => {
                                            const nextValue = Number(e.target.value);
                                            const safeValue = Number.isNaN(nextValue) ? 0 : nextValue;
                                            updateForm((state) => ({ ...state, percentAmount: safeValue }));
                                        }}
                                        onKeyDown={() => clearError("amount")}
                                    />
                                    <Field>
                                        <FieldLabel>Duration</FieldLabel>
                                        <Select value={formState.duration} onValueChange={(value) => {
                                            clearError("durationInMonths");
                                            updateForm((state) => ({ ...state, duration: value }));
                                        }}>
                                            <SelectTrigger aria-label="Duration"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {availableDurationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    {formState.duration === "repeating" && (
                                        <div className="-mt-4">
                                            <TextField
                                                error={Boolean(errors.durationInMonths)}
                                                hint={errors.durationInMonths}
                                                rightAddon={formState.durationInMonths === 1 ? "month" : "months"}
                                                testId="duration-months-input"
                                                type="number"
                                                value={formState.durationInMonths === 0 ? "" : String(formState.durationInMonths)}
                                                onChange={(e) => {
                                                    const nextValue = Number(e.target.value);
                                                    updateForm((state) => ({ ...state, durationInMonths: Number.isNaN(nextValue) ? 0 : nextValue }));
                                                }}
                                                onKeyDown={() => clearError("durationInMonths")}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {formState.type === "free_months" && (
                                <TextField
                                    error={Boolean(errors.amount)}
                                    hint={errors.amount}
                                    rightAddon={formState.freeMonths === 1 ? "month" : "months"}
                                    title="Free months"
                                    type="number"
                                    value={formState.freeMonths === 0 ? "" : String(formState.freeMonths)}
                                    onChange={(e) => {
                                        const nextValue = Number(e.target.value);
                                        updateForm((state) => ({ ...state, freeMonths: Number.isNaN(nextValue) ? 0 : nextValue }));
                                    }}
                                    onKeyDown={() => clearError("amount")}
                                />
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export function EditRetentionOfferDialog() {
    const { cadence: cadenceParam } = useParams();
    const id = cadenceParam || "";
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site ?? null;
    const { data: { tiers = [] } = {} } = useBrowseTiers();
    const { data: { offers: allOffers = [] } = {}, isFetched: hasFetchedOffers, isFetching: isFetchingOffers } = useBrowseOffers();
    const { mutateAsync: addOffer } = useAddOffer();
    const { mutateAsync: editOffer } = useEditOffer();
    const invalidateOffers = useInvalidateOffers();
    const [href, setHref] = useState<string>("");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
    const cadence = id === "monthly" ? "monthly" : "yearly" as const;
    const breadcrumbTitle = cadence === "monthly" ? "Monthly retention" : "Yearly retention";
    const offerCadence = cadence === "monthly" ? "month" : "year";
    const activePaidTiers = getPaidActiveTiers(tiers || []);
    const retentionOffersByCadence = useMemo(() => {
        return allOffers
            .filter((offer) => {
                return offer.redemption_type === "retention" && offer.cadence === offerCadence;
            })
            .sort((left, right) => {
                const leftTimestamp = left.created_at ? new Date(left.created_at).getTime() : 0;
                const rightTimestamp = right.created_at ? new Date(right.created_at).getTime() : 0;
                return rightTimestamp - leftTimestamp;
            });
    }, [allOffers, offerCadence]);
    const activeRetentionOffer = useMemo(() => {
        return retentionOffersByCadence.find((offer) => offer.status === "active") || null;
    }, [retentionOffersByCadence]);
    const latestRetentionOffer = retentionOffersByCadence[0] || null;
    const editableRetentionOffer = activeRetentionOffer || latestRetentionOffer;
    const retentionRedemptions = useMemo(() => {
        return retentionOffersByCadence.reduce((total, offer) => {
            return total + (offer.redemption_count || 0);
        }, 0);
    }, [retentionOffersByCadence]);
    const retentionOfferIdsByCadence = useMemo(() => {
        return retentionOffersByCadence.map((offer) => offer.id);
    }, [retentionOffersByCadence]);
    const latestRetentionRedemption = useMemo(() => {
        return retentionOffersByCadence
            .map((offer) => offer.last_redeemed)
            .filter((lastRedeemed): lastRedeemed is string => !!lastRedeemed)
            .sort((left, right) => {
                return new Date(right).getTime() - new Date(left).getTime();
            })[0] || null;
    }, [retentionOffersByCadence]);
    const retentionMembersFilterUrl = useMemo(() => {
        if (retentionRedemptions === 0 || retentionOfferIdsByCadence.length === 0) {
            return null;
        }

        return createOfferRedemptionsFilterUrl(retentionOfferIdsByCadence);
    }, [retentionOfferIdsByCadence, retentionRedemptions]);
    const [lastPreviewPercentAmount, setLastPreviewPercentAmount] = useState(20);
    const [lastPreviewFreeMonths, setLastPreviewFreeMonths] = useState(1);
    const [initializedOfferKey, setInitializedOfferKey] = useState<string | null>(null);
    const handleSaveError = (error: unknown) => {
        let message = "Please try again later";

        if (error instanceof JSONError && error.data && error.data.errors[0]) {
            message = error.data.errors[0].context || error.data.errors[0].message || message;
        }

        toast.dismiss();
        showToast({
            title: "Failed to save offer",
            type: "error",
            message,
        });
    };

    const { formState, setFormState, updateForm, handleSave, saveState, okProps, errors, clearError } = useForm({
        initialState: getDefaultState(cadence),
        savingDelay: 500,
        onSave: async () => {
            let didMutate = false;
            const formTerms = getFormOfferTerms({
                formState,
                lastPercentAmount: lastPreviewPercentAmount,
                lastFreeMonths: lastPreviewFreeMonths,
            });
            const existingTerms = getOfferTerms(editableRetentionOffer);
            const termsChanged = getTermsSignature(existingTerms) !== getTermsSignature(formTerms);
            const nextStatus = formState.enabled ? "active" : "archived";
            const displayTitle = formState.displayTitle || "";
            const displayDescription = formState.displayDescription || "";
            const hasDisplayChanges = editableRetentionOffer
                ? displayTitle !== (editableRetentionOffer.display_title || "") ||
                    displayDescription !== (editableRetentionOffer.display_description || "")
                : displayTitle !== "" || displayDescription !== "";
            const defaultState = getDefaultState(cadence);
            const shouldCreateInactiveDraft = !formState.enabled && !editableRetentionOffer && hasFormChangesFromDefault(formState, defaultState);

            const createRetentionOffer = async (status: "active" | "archived") => {
                const hash = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, "0");
                const offerName = generateRetentionOfferName(formTerms, hash);

                await addOffer({
                    name: offerName,
                    code: hash,
                    display_title: displayTitle,
                    display_description: displayDescription,
                    cadence: offerCadence,
                    amount: formTerms.amount,
                    duration: formTerms.duration,
                    duration_in_months: formTerms.duration === "repeating" ? formTerms.durationInMonths : null,
                    currency: null,
                    status,
                    redemption_type: "retention",
                    tier: null,
                    type: formTerms.type,
                    currency_restriction: false,
                });
                didMutate = true;
            };

            const invalidateOffersIfNeeded = async () => {
                if (didMutate) {
                    await invalidateOffers();
                }
            };

            if (!editableRetentionOffer && !formState.enabled && !shouldCreateInactiveDraft) {
                return;
            }

            if (termsChanged) {
                if (!formState.enabled && activeRetentionOffer) {
                    await editOffer({ ...activeRetentionOffer, status: "archived" });
                    didMutate = true;
                }

                await createRetentionOffer(nextStatus);
                await invalidateOffersIfNeeded();
                return;
            }

            if (editableRetentionOffer) {
                const hasStatusChange = editableRetentionOffer.status !== nextStatus;
                if (hasDisplayChanges || hasStatusChange) {
                    await editOffer({
                        ...editableRetentionOffer,
                        display_title: displayTitle,
                        display_description: displayDescription,
                        status: nextStatus,
                    });
                    didMutate = true;
                }
                await invalidateOffersIfNeeded();
                return;
            }

            if (formState.enabled || shouldCreateInactiveDraft) {
                await createRetentionOffer(nextStatus);
            }

            await invalidateOffersIfNeeded();
        },
        onSaveError: handleSaveError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.enabled) {
                return newErrors;
            }

            if (formState.type === "percent") {
                if (formState.percentAmount < 1 || formState.percentAmount > 100) {
                    newErrors.amount = "Enter an amount between 1 and 100%.";
                }

                if (formState.duration === "repeating" && !isValidMonthDuration(formState.durationInMonths)) {
                    newErrors.durationInMonths = RETENTION_MONTHS_ERROR_MESSAGE;
                }
            }

            if (formState.type === "free_months") {
                if (!isValidMonthDuration(formState.freeMonths)) {
                    newErrors.amount = RETENTION_MONTHS_ERROR_MESSAGE;
                }
            }

            return newErrors;
        },
    });

    const activeRetentionOfferId = editableRetentionOffer?.id || "none";
    const currentOfferKey = `${id}:${activeRetentionOfferId}`;

    useEffect(() => {
        if (!hasFetchedOffers || isFetchingOffers || saveState === "unsaved" || initializedOfferKey === currentOfferKey) {
            return;
        }

        setFormState(() => getRetentionOfferFormState(editableRetentionOffer, cadence));
        setInitializedOfferKey(currentOfferKey);
    }, [cadence, currentOfferKey, editableRetentionOffer, hasFetchedOffers, initializedOfferKey, isFetchingOffers, saveState, setFormState]);

    useEffect(() => {
        if (formState.percentAmount > 0) {
            setLastPreviewPercentAmount(formState.percentAmount);
        }
    }, [formState.percentAmount]);

    useEffect(() => {
        if (formState.freeMonths > 0) {
            setLastPreviewFreeMonths(formState.freeMonths);
        }
    }, [formState.freeMonths]);

    const goBack = () => {
        navigate("/settings/offers/edit");
    };

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", goBack);
    };

    const handleSaveClick = async () => {
        try {
            if (await handleSave({ force: true })) {
                goBack();
            }
        } catch {
            // Error toast is handled in onSaveError
        }
    };

    const previewData: offerPortalPreviewUrlTypes = useMemo(() => {
        const previewTerms = getFormOfferTerms({
            formState,
            lastPercentAmount: lastPreviewPercentAmount,
            lastFreeMonths: lastPreviewFreeMonths,
        });
        const previewTier = activePaidTiers.find((tier) => {
            if (offerCadence === "month") {
                return tier.monthly_price;
            }

            return tier.yearly_price;
        });

        return {
            name: `${cadence} retention`,
            code: `${cadence}-retention`,
            displayTitle: formState.displayTitle || "",
            displayDescription: formState.displayDescription || "",
            type: previewTerms.type,
            cadence: offerCadence,
            amount: previewTerms.amount,
            duration: previewTerms.duration,
            durationInMonths: previewTerms.durationInMonths,
            currency: "",
            status: "active",
            tierId: previewTier?.id || "",
            redemptionType: "retention",
        };
    }, [activePaidTiers, cadence, formState, lastPreviewFreeMonths, lastPreviewPercentAmount, offerCadence]);

    useEffect(() => {
        if (!siteData?.url) {
            setHref("");
            return;
        }

        const newHref = getOfferPortalPreviewUrl(previewData, siteData.url);
        setHref(newHref);
    }, [previewData, siteData?.url]);

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            cancelLabel="Cancel"
            device={previewDevice}
            okLabel={okProps.label || "Save"}
            preview={<PortalFrame href={href || ""} selectedTab="offers" />}
            previewToolbarTabs={<OffersBreadcrumbs current={breadcrumbTitle} onBack={goBack} />}
            sidebar={(
                <RetentionOfferSidebar
                    cadence={cadence}
                    clearError={clearError}
                    errors={errors}
                    formState={formState}
                    lastRedeemed={latestRetentionRedemption}
                    membersFilterUrl={retentionMembersFilterUrl}
                    redemptions={retentionRedemptions}
                    updateForm={updateForm}
                />
            )}
            testId="retention-offer-modal"
            title="Offer"
            onClose={requestClose}
            onDeviceChange={setPreviewDevice}
            onOk={() => void handleSaveClick()}
        />
    );
}
