import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    Button,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea,
} from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { getPaidActiveTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useAddOffer, useBrowseOffers } from "@tryghost/admin-x-framework/api/offers";
import { useNavigate } from "@tryghost/admin-x-framework";
import type { SiteData } from "@tryghost/admin-x-framework/api/site";
import { getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes } from "@tryghost/admin-x-settings/src/utils/get-offers-portal-preview-url";
import { getTiersCadences } from "@tryghost/admin-x-settings/src/utils/get-tiers-cadences";

import { PortalFrame } from "@/settings/membership/portal-frame";
import { type PreviewDevice, PreviewDialog } from "@/settings/site/preview-chrome";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast } from "@/settings/app/shared/toast";

/**
 * The routed add-offer dialog (`/settings/offers/new`), ported from the
 * legacy offers/add-offer-modal.tsx onto the shared PreviewDialog chrome
 * with the live portal offer preview.
 */

// we should replace this with a library
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");
}

const MAX_DISPLAY_TEXT_LENGTH = 191;

type FormState = {
    disableBackground?: boolean;
    name: string;
    code: {
        isDirty: boolean;
        value: string;
    };
    displayTitle: {
        isDirty: boolean;
        value: string;
    };
    displayDescription: string;
    type: string;
    cadence: string;
    amount: number;
    duration: string;
    durationInMonths: number;
    currency: string;
    status: string;
    tierId: string;
    fixedAmount: number;
    trialAmount: number;
    percentAmount: number;
};

interface OfferSelectOption {
    label: string;
    value: string;
}

const typeOptions = [
    { title: "Discount", description: "Offer a special reduced price", value: "percent" },
    { title: "Free trial", description: "Give free access for a limited time", value: "trial" },
];

const durationOptions = [
    { value: "once", label: "First-payment" },
    { value: "repeating", label: "Multiple-months" },
    { value: "forever", label: "Forever" },
];

const calculateAmount = (formState: FormState): number => {
    const { fixedAmount = 0, percentAmount = 0, trialAmount = 0, amount = 0 } = formState;

    switch (formState.type) {
        case "fixed":
            return fixedAmount * 100;
        case "percent":
            return percentAmount;
        case "trial":
            return trialAmount;
        default:
            return amount;
    }
};

const parseData = (input: string): { id: string; period: string; currency: string } => {
    const [id, period, currency] = input.split("-");
    if (!id || !period || !currency) {
        throw new Error("Invalid input format. Expected format is: id-period-currency");
    }
    return { id, period, currency };
};

function AddOfferSidebar({ overrides, errors, clearError, tierOptions, selectedTier, homepageUrl, handlers }: {
    overrides: FormState;
    errors: ErrorMessages;
    clearError: (field: string) => void;
    tierOptions: OfferSelectOption[];
    selectedTier: OfferSelectOption | undefined;
    homepageUrl: string;
    handlers: {
        handleTierChange: (tier: OfferSelectOption) => void;
        handleTypeChange: (type: string) => void;
        handleAmountTypeChange: (amountType: string) => void;
        handleAmountInput: (value: string) => void;
        handleDurationChange: (duration: string) => void;
        handleDurationInMonthsInput: (value: string) => void;
        handleNameInput: (value: string) => void;
        handleDisplayTitleInput: (value: string) => void;
        handleDisplayDescriptionInput: (value: string) => void;
        handleTrialAmountInput: (value: string) => void;
        handleCodeInput: (value: string) => void;
    };
}) {
    const isYearlyTier = overrides.cadence === "year";
    const filteredDurationOptions = isYearlyTier
        ? durationOptions.filter((option) => option.value !== "repeating")
        : durationOptions;

    const [nameLength, setNameLength] = useState(0);
    const nameLengthColor = nameLength > 40 ? "text-destructive" : "text-green";

    const [isCopied, setIsCopied] = useState(false);
    const offerUrl = `${homepageUrl}${overrides.code.value}`;
    const handleCopyClick = async () => {
        await navigator.clipboard.writeText(offerUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const amountOptions = [
        { value: "percent", label: "%" },
        { value: "fixed", label: overrides.currency },
    ];

    return (
        <div className="pt-4" data-testid="add-offer-sidebar">
            <section>
                <h2 className="mb-4 text-lg font-semibold tracking-tight">General</h2>
                <div className="flex flex-col gap-6">
                    <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name || <span className="flex justify-between"><span>Visible to members on Stripe Checkout page</span><strong><span className={nameLengthColor}>{formatNumber(nameLength)}</span> / {formatNumber(40)}</strong></span>}
                        maxLength={40}
                        placeholder="Black Friday"
                        title="Offer name"
                        onChange={(e) => {
                            handlers.handleNameInput(e.target.value);
                            setNameLength(e.target.value.length);
                        }}
                        onKeyDown={() => clearError("name")}
                    />
                    <TextField
                        error={Boolean(errors.displayTitle)}
                        hint={errors.displayTitle}
                        maxLength={MAX_DISPLAY_TEXT_LENGTH}
                        placeholder="Black Friday Special"
                        title="Display title"
                        value={overrides.displayTitle.value}
                        onChange={(e) => handlers.handleDisplayTitleInput(e.target.value)}
                        onKeyDown={() => clearError("displayTitle")}
                    />
                    <Field>
                        <FieldLabel htmlFor="offer-display-description">Display description</FieldLabel>
                        <Textarea
                            className="border-transparent bg-muted"
                            id="offer-display-description"
                            maxLength={MAX_DISPLAY_TEXT_LENGTH}
                            placeholder="Take advantage of this limited-time offer."
                            value={overrides.displayDescription}
                            onChange={(e) => handlers.handleDisplayDescriptionInput(e.target.value)}
                        />
                    </Field>
                </div>
            </section>
            <section className="mt-8">
                <h2 className="mb-4 text-lg font-semibold tracking-tight">Details</h2>
                <div className="flex flex-col gap-6">
                    <RadioGroup
                        aria-label="Offer type"
                        className="rounded-md border border-border p-4"
                        value={overrides.type === "trial" ? "trial" : "percent"}
                        onValueChange={handlers.handleTypeChange}
                    >
                        {typeOptions.map((option) => {
                            const id = `offer-type-${option.value}`;
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
                    <Field>
                        <FieldLabel>Tier — Cadence</FieldLabel>
                        <Select value={selectedTier?.value} onValueChange={(value) => {
                            const tier = tierOptions.find((option) => option.value === value);
                            if (tier) {
                                handlers.handleTierChange(tier);
                            }
                        }}>
                            <SelectTrigger aria-label="Tier — Cadence" data-testid="tier-cadence-select-offers"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {tierOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    {overrides.type !== "trial" && (
                        <>
                            <Field data-invalid={Boolean(errors.amount) || undefined}>
                                <FieldLabel htmlFor="offer-amount">Amount off</FieldLabel>
                                <InputGroup className="border-transparent bg-muted" data-invalid={Boolean(errors.amount) || undefined}>
                                    <InputGroupInput
                                        id="offer-amount"
                                        type="number"
                                        value={
                                            overrides.type === "fixed"
                                                ? (overrides.fixedAmount === 0 ? "" : overrides.fixedAmount?.toString())
                                                : (overrides.percentAmount === 0 ? "" : overrides.percentAmount?.toString())
                                        }
                                        onChange={(e) => handlers.handleAmountInput(e.target.value)}
                                        onKeyDown={() => clearError("amount")}
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <Select
                                            value={overrides.type === "percent" ? amountOptions[0].value : amountOptions[1].value}
                                            onValueChange={handlers.handleAmountTypeChange}
                                        >
                                            <SelectTrigger aria-label="Amount type" className="h-7 w-20 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0" data-testid="amount-type-select-offers">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                {amountOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </InputGroupAddon>
                                </InputGroup>
                                {errors.amount && <FieldError>{errors.amount}</FieldError>}
                            </Field>
                            <Field>
                                <FieldLabel>Duration</FieldLabel>
                                <Select value={overrides.duration} onValueChange={(value) => {
                                    clearError("durationInMonths");
                                    handlers.handleDurationChange(value);
                                }}>
                                    <SelectTrigger aria-label="Duration" data-testid="duration-select-offers"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {filteredDurationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            {overrides.duration === "repeating" && !isYearlyTier && (
                                <div className="-mt-4">
                                    <TextField
                                        error={Boolean(errors.durationInMonths)}
                                        hint={errors.durationInMonths}
                                        rightAddon={overrides.durationInMonths === 1 ? "month" : "months"}
                                        testId="duration-months-input"
                                        type="number"
                                        value={overrides.durationInMonths === 0 ? "" : String(overrides.durationInMonths)}
                                        onChange={(e) => handlers.handleDurationInMonthsInput(e.target.value)}
                                        onKeyDown={() => clearError("durationInMonths")}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    {overrides.type === "trial" && (
                        <TextField
                            error={Boolean(errors.amount)}
                            hint={errors.amount}
                            title="Trial duration"
                            type="number"
                            value={overrides.trialAmount?.toString()}
                            onChange={(e) => handlers.handleTrialAmountInput(e.target.value)}
                            onKeyDown={() => clearError("amount")}
                        />
                    )}
                    <TextField
                        error={Boolean(errors.code)}
                        hint={errors.code || (overrides.code.value !== "" ? (
                            <span className="flex items-center justify-between">
                                <span>{homepageUrl}<span className="font-bold">{overrides.code.value}</span></span>
                                <Button className="h-auto p-0 text-sm" size="sm" variant="link" onClick={() => void handleCopyClick()}>{isCopied ? "Copied" : "Copy"}</Button>
                            </span>
                        ) : null)}
                        placeholder="black-friday"
                        title="Offer code"
                        value={overrides.code.value}
                        onChange={(e) => handlers.handleCodeInput(e.target.value)}
                        onKeyDown={() => clearError("code")}
                    />
                </div>
            </section>
        </div>
    );
}

function AddOfferDialogContent({ siteData }: { siteData: SiteData }) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();

    const [href, setHref] = useState<string>("");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
    const { data: { tiers } = {} } = useBrowseTiers();
    const activeTiers = getPaidActiveTiers(tiers || []);
    const tierCadenceOptions = getTiersCadences(activeTiers);
    const { mutateAsync: addOffer } = useAddOffer();
    const [selectedTier, setSelectedTier] = useState({
        tier: tierCadenceOptions[0],
        dataset: {
            id: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).id : "",
            period: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).period : "",
            currency: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).currency : "",
        },
    });

    const { data: { offers: allOffers = [] } = {} } = useBrowseOffers();

    const { formState, updateForm, handleSave, saveState, okProps, validate, errors, clearError } = useForm<FormState>({
        initialState: {
            disableBackground: false,
            name: "",
            code: {
                isDirty: false,
                value: "",
            },
            displayTitle: {
                isDirty: false,
                value: "",
            },
            displayDescription: "",
            type: "percent",
            cadence: selectedTier?.dataset?.period || "",
            amount: 0,
            duration: "once",
            durationInMonths: 1,
            currency: selectedTier?.dataset?.currency || "USD",
            status: "active",
            tierId: selectedTier?.dataset?.id || "",
            trialAmount: 7,
            fixedAmount: 0,
            percentAmount: 0,
        },
        onSave: async () => {
            const duration = formState.type === "trial" ? "trial" : formState.duration;
            const dataset = {
                name: formState.name,
                code: formState.code.value,
                display_title: formState.displayTitle.value,
                display_description: formState.displayDescription,
                cadence: formState.cadence,
                amount: calculateAmount(formState) || 0,
                duration,
                ...(duration === "repeating" ? { duration_in_months: formState.durationInMonths } : {}),
                currency: formState.currency,
                status: formState.status,
                redemption_type: "signup" as const,
                tier: {
                    id: formState.tierId,
                },
                type: formState.type,
                currency_restriction: false,
            };

            const response = await addOffer(dataset);

            if (response && response.offers && response.offers.length > 0) {
                navigate(`/settings/offers/success/${response.offers[0].id}`);
            }
        },
        onSaveError: () => {},
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name && formState.name.length === 0) {
                newErrors.name = "Name is required";
            }

            if (!formState.code.value && formState.code.value.length === 0) {
                newErrors.code = "Code is required";
            }

            if (!formState.displayTitle.value && formState.displayTitle.value.length === 0) {
                newErrors.displayTitle = "Display title is required";
            }

            if (formState.type === "percent" && formState.percentAmount === 0) {
                newErrors.amount = "Enter an amount greater than 0.";
            }

            if (formState.type === "percent" && (formState.percentAmount < 1 || formState.percentAmount > 100)) {
                newErrors.amount = "Enter an amount between 1 and 100%.";
            }

            if ((formState.type === "fixed" && formState.fixedAmount === 0) || (formState.type === "fixed" && formState.fixedAmount < 1)) {
                newErrors.amount = "Enter an amount greater than 0.";
            }

            if (formState.type === "trial" && formState.trialAmount === 0) {
                newErrors.amount = "Enter an amount greater than 0.";
            }

            if (formState.type === "trial" && formState.trialAmount < 1) {
                newErrors.amount = "Free trial must be at least 1 day.";
            }

            if (formState.type !== "trial" && formState.duration === "repeating" && (!Number.isInteger(formState.durationInMonths) || formState.durationInMonths < 1)) {
                newErrors.durationInMonths = "Enter a whole number of months (1 or more).";
            }

            return newErrors;
        },
        savingDelay: 500,
    });

    const handleTierChange = (tier: OfferSelectOption) => {
        const parsedTier = parseData(tier.value);
        const isYearlyCadence = parsedTier.period === "year";

        setSelectedTier({
            tier,
            dataset: parsedTier,
        });
        updateForm((state) => ({
            ...state,
            cadence: parsedTier.period,
            currency: parsedTier.currency,
            tierId: parsedTier.id,
            duration: isYearlyCadence && state.duration === "repeating" ? "once" : state.duration,
        }));

        if (isYearlyCadence) {
            clearError("durationInMonths");
        }
    };

    const handlers = {
        handleTierChange,
        handleTypeChange: (type: string) => {
            if (type === "trial") {
                clearError("amount");
                clearError("durationInMonths");
            }

            updateForm((state) => ({ ...state, type }));
        },
        handleAmountTypeChange: (amountType: string) => {
            updateForm((state) => ({ ...state, type: amountType === "percent" ? "percent" : "fixed" }));
        },
        handleAmountInput: (value: string) => {
            updateForm((state) => {
                if (state.type === "fixed") {
                    return { ...state, fixedAmount: Number(value) };
                }
                if (state.type === "percent") {
                    return { ...state, percentAmount: Number(value) };
                }
                return { ...state, amount: Number(value) };
            });
        },
        handleDurationChange: (duration: string) => {
            updateForm((state) => ({ ...state, duration }));
        },
        handleDurationInMonthsInput: (value: string) => {
            const nextValue = Number(value);
            updateForm((state) => ({ ...state, durationInMonths: Number.isNaN(nextValue) ? 0 : nextValue }));
        },
        handleNameInput: (value: string) => {
            updateForm((prevOverrides) => {
                const newOverrides = { ...prevOverrides };
                newOverrides.name = value;
                if (!prevOverrides.code.isDirty) {
                    clearError("code");
                    newOverrides.code = {
                        ...prevOverrides.code,
                        value: slugify(value),
                    };
                }
                if (!prevOverrides.displayTitle.isDirty) {
                    clearError("displayTitle");
                    newOverrides.displayTitle = {
                        ...prevOverrides.displayTitle,
                        value,
                    };
                }
                return newOverrides;
            });
        },
        handleDisplayTitleInput: (value: string) => {
            updateForm((state) => ({
                ...state,
                displayTitle: {
                    ...state.displayTitle,
                    isDirty: true,
                    value,
                },
            }));
        },
        handleDisplayDescriptionInput: (value: string) => {
            updateForm((state) => ({ ...state, displayDescription: value }));
        },
        handleTrialAmountInput: (value: string) => {
            updateForm((state) => ({ ...state, trialAmount: Number(value) }));
        },
        handleCodeInput: (value: string) => {
            updateForm((state) => ({
                ...state,
                code: {
                    ...state.code,
                    isDirty: true,
                    value,
                },
            }));
        },
    };

    const cancelAddOffer = () => {
        confirmIfDirty(confirm, saveState === "unsaved", () => {
            if (allOffers.length > 0) {
                navigate("/settings/offers/edit");
            } else {
                navigate("/settings/offers");
            }
        });
    };

    const overrides: offerPortalPreviewUrlTypes = useMemo(() => {
        return {
            name: formState.name || "",
            code: formState.code.value || "",
            displayTitle: formState.displayTitle.value || "",
            displayDescription: formState.displayDescription || "",
            type: formState.type || "percent",
            cadence: formState.cadence || "month",
            amount: calculateAmount(formState) || 0,
            duration: formState.type === "trial" ? "trial" : formState.duration || "once",
            durationInMonths: formState.durationInMonths || 0,
            currency: formState.currency || "USD",
            status: formState.status || "active",
            tierId: formState.tierId || activeTiers[0]?.id,
            redemptionType: "signup",
        };
    }, [formState, activeTiers]);

    useEffect(() => {
        const newHref = getOfferPortalPreviewUrl(overrides, siteData.url);
        setHref(newHref);
    }, [siteData.url, overrides]);

    const onOk = async () => {
        if (!validate()) {
            toast.dismiss();
            showToast({
                title: "Can't save offer",
                type: "info",
                message: "Make sure you filled all required fields",
            });
            return;
        }

        try {
            await handleSave({ force: true });
        } catch (e) {
            let message;

            if (e instanceof JSONError && e.data && e.data.errors[0]) {
                message = e.data.errors[0].context || e.data.errors[0].message;
            }

            toast.dismiss();
            if (message) {
                showToast({
                    title: "Can't save offer",
                    type: "error",
                    message,
                });
            }
        }
    };

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            cancelLabel="Cancel"
            device={previewDevice}
            okLabel="Publish"
            preview={<PortalFrame href={href || ""} selectedTab="offers" />}
            sidebar={(
                <AddOfferSidebar
                    clearError={clearError}
                    errors={errors}
                    handlers={handlers}
                    homepageUrl={getHomepageUrl(siteData)}
                    overrides={formState}
                    selectedTier={selectedTier.tier}
                    tierOptions={tierCadenceOptions}
                />
            )}
            testId="add-offer-modal"
            title="Offer"
            onClose={cancelAddOffer}
            onDeviceChange={setPreviewDevice}
            onOk={() => void onOk()}
        />
    );
}

export function AddOfferDialog() {
    const { data: siteResponse } = useBrowseSite();
    const { data: tiersData } = useBrowseTiers();
    const { data: offersData } = useBrowseOffers();

    if (!siteResponse || !tiersData || !offersData) {
        return null;
    }

    return <AddOfferDialogContent siteData={siteResponse.site} />;
}
