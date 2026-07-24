import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import {
    Button,
    Combobox,
    ComboboxContent,
    ComboboxTrigger,
    ComboboxValue,
    Dialog,
    DialogContent,
    DialogTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
    MultiSelectCombobox,
    Switch,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import { type Tier, useAddTier, useBrowseTiers, useEditTier } from "@tryghost/admin-x-framework/api/tiers";
import { getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";
import { currencies, currencySelectGroups, validateCurrencyAmount } from "@tryghost/admin-x-settings/src/utils/currency";
import useCurrencyInput from "@tryghost/admin-x-settings/src/hooks/use-currency-input";
import useUrlInput from "@tryghost/admin-x-settings/src/hooks/use-url-input";

import { TierDetailPreview } from "./tier-detail-preview";
import { useSortableIndexedList } from "./use-sortable-indexed-list";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The routed tier detail dialog (`/settings/tiers/add`, `/settings/tiers/:id`),
 * ported from the legacy tier-detail-modal.tsx: name/description, prices with
 * currency select, free trial, welcome page, sortable benefits and the
 * archive/reactivate flow, with the live preview beside the form.
 */

export type TierFormState = Partial<Omit<Tier, "trial_days">> & {
    trial_days: string;
};

function SortableBenefit({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            className="group flex w-full items-center gap-3 bg-background py-1"
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            <button
                aria-label="Reorder benefit"
                className="cursor-grab opacity-0 group-hover:opacity-100"
                type="button"
                {...attributes}
                {...listeners}
            >
                <LucideIcon.GripVertical className="size-4 text-muted-foreground" />
            </button>
            {children}
        </div>
    );
}

function TierDetailDialogContent({ tier }: { tier?: Tier }) {
    const isFreeTier = tier?.type === "free";
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const [open, setOpen] = useState(true);

    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { mutateAsync: updateTier } = useEditTier();
    const { mutateAsync: createTier } = useAddTier();
    const { mutateAsync: editSettings } = useEditSettings();
    const [hasFreeTrial, setHasFreeTrial] = useState(!!tier?.trial_days);
    const handleError = useSettingsHandleError();
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site;
    const [portalPlansJson] = getSettingValues(settingsData?.settings ?? [], ["portal_plans"]) as string[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || "[]") as string[];
    const currencyOptions = currencySelectGroups().flatMap((group) => group.options.map((option) => ({ ...option, metadata: { groupKey: group.key, groupLabel: group.label } })));

    const validators: { [key in keyof Tier]?: () => string | undefined } = {
        name: () => (formState.name ? undefined : "Enter a name for the tier"),
        monthly_price: () => (formState.type !== "free" ? validateCurrencyAmount(formState.monthly_price || 0, formState.currency, { allowZero: false }) : undefined),
        yearly_price: () => (formState.type !== "free" ? validateCurrencyAmount(formState.yearly_price || 0, formState.currency, { allowZero: false }) : undefined),
    };

    const { formState, saveState, updateForm, handleSave, errors, clearError, okProps } = useForm<TierFormState>({
        initialState: {
            ...(tier || {}),
            trial_days: tier?.trial_days?.toString() || "",
            currency: tier?.currency || currencies[0].isoCode,
            visibility: tier?.visibility || "none",
            welcome_page_url: tier?.welcome_page_url || null,
        },
        savingDelay: 500,
        savedDelay: 500,
        onValidate: () => {
            const newErrors: ErrorMessages = {};

            Object.entries(validators).forEach(([key, validator]) => {
                newErrors[key as keyof Tier] = validator?.();
            });

            return newErrors;
        },
        onSave: async () => {
            const { trial_days: trialDays, currency, ...rest } = formState;
            const values: Partial<Tier> = rest;

            values.benefits = values.benefits?.filter((benefit) => benefit);

            if (!isFreeTier) {
                values.currency = currency;
                values.trial_days = parseInt(trialDays);
            }

            if (tier?.id) {
                await updateTier({ ...tier, ...values });
            } else {
                await createTier(values);
            }
            if (isFreeTier) {
                // The free tier is a special case: its visibility must also be
                // reflected in portal_plans.
                const visible = formState.visibility === "public";
                let save = false;

                if (portalPlans.includes("free") && !visible) {
                    portalPlans.splice(portalPlans.indexOf("free"), 1);
                    save = true;
                }

                if (!portalPlans.includes("free") && visible) {
                    portalPlans.push("free");
                    save = true;
                }

                if (save) {
                    await editSettings([{ key: "portal_plans", value: JSON.stringify(portalPlans) }]);
                }
            }
        },
        onSaveError: handleError,
    });

    const monthlyPriceInput = useCurrencyInput(formState.monthly_price || "", (price) => updateForm((state) => ({ ...state, monthly_price: price })));
    const yearlyPriceInput = useCurrencyInput(formState.yearly_price || "", (price) => updateForm((state) => ({ ...state, yearly_price: price })));
    const welcomePageUrlInput = useUrlInput({
        baseUrl: siteData?.url,
        nullable: true,
        transformPathWithoutSlash: true,
        value: formState.welcome_page_url || null,
        onChange: (value) => updateForm((state) => ({ ...state, welcome_page_url: value || null })),
    });

    const benefits = useSortableIndexedList({
        items: formState.benefits || [],
        setItems: (newBenefits) => updateForm((state) => ({ ...state, benefits: newBenefits })),
        blank: "",
        canAddNewItem: (item) => !!item,
    });

    const toggleFreeTrial = (checked: boolean) => {
        if (checked) {
            setHasFreeTrial(true);
            updateForm((state) => ({ ...state, trial_days: tier?.trial_days ? tier?.trial_days.toString() : "7" }));
        } else {
            setHasFreeTrial(false);
            updateForm((state) => ({ ...state, trial_days: "0" }));
        }
    };

    // Only validate amounts when the user changes currency, don't show errors on initial render
    const didInitialRender = useRef(false);
    useEffect(() => {
        if (didInitialRender.current) {
            validators.monthly_price?.();
            validators.yearly_price?.();
        }

        didInitialRender.current = true;
         
    }, [formState.currency]);

    const closeDialog = () => {
        setOpen(false);
        navigate("/settings/tiers");
    };

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", closeDialog);
    };

    const confirmTierStatusChange = () => {
        if (!tier) {
            return;
        }
        const prompt = tier.active ? (
            <>
                <div className="mb-6">Members will no longer be able to subscribe to <strong>{tier.name}</strong> and it will be removed from the list of available tiers in portal.</div>
                <div>Existing members on this tier will remain unchanged. Offers using this tier will be disabled.</div>
            </>
        ) : (
            <>
                <div className="mb-6">Reactivating <strong>{tier.name}</strong> will re-enable it as an option in portal and allow new members to subscribe to this tier.</div>
                <div>Existing members will remain unchanged.</div>
            </>
        );
        confirm({
            title: tier.active ? "Archive tier" : "Reactivate tier",
            prompt,
            okLabel: tier.active ? "Archive" : "Reactivate",
            destructive: tier.active,
            onOk: async () => {
                await updateTier({ ...tier, active: !tier.active });
                showToast({ type: "success", title: `Tier ${tier.active ? "archived" : "reactivated"}` });
            },
        });
    };

    let leftButton: React.ReactNode = null;
    if (tier) {
        if (tier.active && tier.type !== "free") {
            leftButton = (
                <Button className="px-0 text-destructive hover:bg-transparent hover:underline" variant="ghost" onClick={confirmTierStatusChange}>Archive tier</Button>
            );
        } else if (!tier.active) {
            leftButton = (
                <Button className="px-0 text-state-success hover:bg-transparent hover:underline" variant="ghost" onClick={confirmTierStatusChange}>Reactivate tier</Button>
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && requestClose()}>
            <DialogContent
                aria-describedby={undefined}
                className="flex h-[calc(100vh-8vmin)] w-[calc(100vw-8vmin)] max-w-[1120px] flex-col gap-0 overflow-hidden p-0"
                data-testid="tier-detail-modal"
                onInteractOutside={(event) => {
                    // Dismissing a toast is not a request to close the dialog.
                    if (event.target instanceof Element && event.target.closest("[data-sonner-toaster]")) {
                        event.preventDefault();
                    }
                }}
            >
                <div className="flex items-center justify-between border-b border-border px-7 py-5">
                    <DialogTitle>{tier ? (tier.active ? "Edit tier" : "Edit archived tier") : "New tier"}</DialogTitle>
                </div>
                <div className="min-h-0 grow overflow-y-auto px-7">
                    <div className="mt-8 flex items-start gap-8 pb-8">
                        <div className="flex grow flex-col gap-8">
                            <div className="flex flex-col gap-6">
                                <h4 className="text-base font-semibold">Basic</h4>
                                <Field data-invalid={Boolean(errors.name) || undefined}>
                                    <FieldLabel htmlFor="tier-name">Name</FieldLabel>
                                    <Input
                                        aria-invalid={Boolean(errors.name) || undefined}
                                        autoComplete="off"
                                        id="tier-name"
                                        maxLength={191}
                                        placeholder={isFreeTier ? "Free" : "Bronze"}
                                        value={formState.name || ""}
                                        autoFocus
                                        onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
                                        onKeyDown={() => clearError("name")}
                                    />
                                    {errors.name && <FieldError>{errors.name}</FieldError>}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="tier-description">Description</FieldLabel>
                                    <Input
                                        autoComplete="off"
                                        autoFocus={isFreeTier}
                                        id="tier-description"
                                        maxLength={191}
                                        placeholder={isFreeTier ? "Free preview" : "Full access to premium content"}
                                        value={formState.description || ""}
                                        onChange={(e) => updateForm((state) => ({ ...state, description: e.target.value }))}
                                    />
                                </Field>
                                {!isFreeTier && (
                                    <div className="flex flex-col gap-10 md:flex-row">
                                        <div className="basis-1/2">
                                            <div className="mb-1 flex h-6 items-center justify-between">
                                                <h6 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Prices</h6>
                                                <div className="-mr-2 w-20">
                                                    <Field>
                                                        <FieldLabel className="sr-only">Currency</FieldLabel>
                                                        <Combobox open={currencyOpen} onOpenChange={setCurrencyOpen}>
                                                            <ComboboxTrigger aria-label="Currency" className="border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus-visible:ring-0"><ComboboxValue>{formState.currency}</ComboboxValue></ComboboxTrigger>
                                                            <ComboboxContent align="end" className="w-64">
                                                                <MultiSelectCombobox
                                                                    groupBy={(option) => ({
                                                                        key: option.metadata?.groupKey as string,
                                                                        label: option.metadata?.groupLabel as string,
                                                                    })}
                                                                    i18n={{ searchPlaceholder: "Search currencies..." }}
                                                                    isMultiSelect={false}
                                                                    options={currencyOptions}
                                                                    values={formState.currency ? [formState.currency] : []}
                                                                    autoCloseOnSelect
                                                                    onChange={(values) => {
                                                                        if (values[0]) {
                                                                            updateForm((state) => ({ ...state, currency: values[0] }));
                                                                        }
                                                                    }}
                                                                    onClose={() => setCurrencyOpen(false)}
                                                                />
                                                            </ComboboxContent>
                                                        </Combobox>
                                                    </Field>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Field data-invalid={Boolean(errors.monthly_price) || undefined}>
                                                    <FieldLabel className="sr-only" htmlFor="tier-monthly-price">Monthly price</FieldLabel>
                                                    <InputGroup className="border-transparent bg-muted" data-invalid={Boolean(errors.monthly_price) || undefined}>
                                                        <InputGroupInput
                                                            aria-invalid={Boolean(errors.monthly_price) || undefined}
                                                            id="tier-monthly-price"
                                                            inputMode="decimal"
                                                            placeholder="5"
                                                            value={monthlyPriceInput.value}
                                                            onBlur={(event) => {
                                                                monthlyPriceInput.onBlur();
                                                                if (event.target.value === "") {
                                                                    updateForm((state) => ({ ...state, monthly_price: 0 }));
                                                                }
                                                            }}
                                                            onChange={(event) => monthlyPriceInput.onChange(event.target.value)}
                                                            onKeyDown={() => clearError("monthly_price")}
                                                        />
                                                        <InputGroupAddon align="inline-end"><InputGroupText>{formState.currency}/month</InputGroupText></InputGroupAddon>
                                                    </InputGroup>
                                                    {errors.monthly_price && <FieldError>{errors.monthly_price}</FieldError>}
                                                </Field>
                                                <Field data-invalid={Boolean(errors.yearly_price) || undefined}>
                                                    <FieldLabel className="sr-only" htmlFor="tier-yearly-price">Yearly price</FieldLabel>
                                                    <InputGroup className="border-transparent bg-muted" data-invalid={Boolean(errors.yearly_price) || undefined}>
                                                        <InputGroupInput
                                                            aria-invalid={Boolean(errors.yearly_price) || undefined}
                                                            id="tier-yearly-price"
                                                            inputMode="decimal"
                                                            placeholder="50"
                                                            value={yearlyPriceInput.value}
                                                            onBlur={(event) => {
                                                                yearlyPriceInput.onBlur();
                                                                if (event.target.value === "") {
                                                                    updateForm((state) => ({ ...state, yearly_price: 0 }));
                                                                }
                                                            }}
                                                            onChange={(event) => yearlyPriceInput.onChange(event.target.value)}
                                                            onKeyDown={() => clearError("yearly_price")}
                                                        />
                                                        <InputGroupAddon align="inline-end"><InputGroupText>{formState.currency}/year</InputGroupText></InputGroupAddon>
                                                    </InputGroup>
                                                    {errors.yearly_price && <FieldError>{errors.yearly_price}</FieldError>}
                                                </Field>
                                            </div>
                                        </div>
                                        <div className="basis-1/2">
                                            <div className="mb-1 flex h-6 flex-col justify-center">
                                                <Field orientation="horizontal">
                                                    <FieldLabel htmlFor="tier-free-trial">Add a free trial</FieldLabel>
                                                    <Switch checked={hasFreeTrial} id="tier-free-trial" onCheckedChange={toggleFreeTrial} />
                                                </Field>
                                            </div>
                                            <Field data-disabled={!hasFreeTrial || undefined}>
                                                <FieldLabel className="sr-only" htmlFor="tier-trial-days">Trial days</FieldLabel>
                                                <InputGroup className="border-transparent bg-muted" data-disabled={!hasFreeTrial || undefined}>
                                                    <InputGroupInput
                                                        disabled={!hasFreeTrial}
                                                        id="tier-trial-days"
                                                        placeholder="0"
                                                        value={formState.trial_days}
                                                        onChange={(e) => updateForm((state) => ({ ...state, trial_days: e.target.value.replace(/[^\d]/, "") }))}
                                                    />
                                                    <InputGroupAddon align="inline-end"><InputGroupText>days</InputGroupText></InputGroupAddon>
                                                </InputGroup>
                                                <FieldDescription>
                                                    Members will be subscribed at full price once the trial ends. <a className="text-primary" href="https://ghost.org/help/free-trials/" rel="noreferrer" target="_blank">Learn more</a>
                                                </FieldDescription>
                                            </Field>
                                        </div>
                                    </div>
                                )}
                                <Field>
                                    <FieldLabel htmlFor="tier-welcome-page">Welcome page</FieldLabel>
                                    <Input
                                        className="border-transparent bg-muted"
                                        id="tier-welcome-page"
                                        maxLength={2000}
                                        placeholder={siteData?.url}
                                        value={welcomePageUrlInput.displayValue}
                                        onBlur={welcomePageUrlInput.commitValue}
                                        onChange={(event) => welcomePageUrlInput.setDisplayValue(event.target.value)}
                                        onFocus={welcomePageUrlInput.handleFocus}
                                        onKeyDown={welcomePageUrlInput.handleKeyDown}
                                    />
                                    <FieldDescription>Redirect to this URL after signup{isFreeTier ? "" : " for premium membership"}</FieldDescription>
                                </Field>
                            </div>

                            <div className="flex flex-col gap-1">
                                <h4 className="text-base font-semibold">Benefits</h4>
                                <div className="ml-[-28px]">
                                    <DndContext
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event) => benefits.moveItem(event.active.id as string, event.over?.id as string | undefined)}
                                    >
                                        <SortableContext items={benefits.items} strategy={verticalListSortingStrategy}>
                                            {benefits.items.map(({ id, item }) => (
                                                <SortableBenefit key={id} id={id}>
                                                    <div className="relative flex w-full items-center gap-3">
                                                        <LucideIcon.Check className="size-4 shrink-0" />
                                                        <Input
                                                            aria-label="Benefit"
                                                            maxLength={191}
                                                            value={item}
                                                            onChange={(e) => benefits.updateItem(id, e.target.value)}
                                                        />
                                                        <Button
                                                            aria-label="Delete benefit"
                                                            className="absolute top-1/2 right-1 z-10 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => benefits.removeItem(id)}
                                                        >
                                                            <LucideIcon.Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </SortableBenefit>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <div className="relative mt-1 flex items-center gap-3 pl-[28px]">
                                        <LucideIcon.Check className="size-4 shrink-0" />
                                        <Field className="grow">
                                            <FieldLabel className="sr-only" htmlFor="tier-new-benefit">New benefit</FieldLabel>
                                            <Input
                                                id="tier-new-benefit"
                                                maxLength={191}
                                                placeholder="Expert analysis"
                                                value={benefits.newItem}
                                                onChange={(e) => benefits.setNewItem(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        benefits.addItem();
                                                    }
                                                }}
                                            />
                                        </Field>
                                        <Button
                                            aria-label="Add"
                                            className="absolute top-1/2 right-1 z-10 size-6 -translate-y-1/2 rounded-full bg-state-success p-0 text-white hover:bg-state-success/90"
                                            size="icon"
                                            onClick={() => benefits.addItem()}
                                        >
                                            <LucideIcon.Plus className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="sticky top-0 hidden shrink-0 basis-[380px] min-[920px]:block">
                            <TierDetailPreview isFreeTier={isFreeTier} tier={formState} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border px-7 py-4">
                    <div>{leftButton}</div>
                    <div className="flex items-center gap-2">
                        <Button disabled={okProps.disabled} variant="outline" onClick={requestClose}>Close</Button>
                        <Button
                            disabled={okProps.disabled}
                            variant={okProps.color === "red" ? "destructive" : "default"}
                            onClick={() => void handleSave({ fakeWhenUnchanged: true })}
                        >
                            {okProps.label || "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function TierDetailDialog() {
    const { tierId } = useParams();
    const { data: { tiers, isEnd } = {}, fetchNextPage } = useBrowseTiers();

    const tier = tierId ? tiers?.find(({ id }) => id === tierId) : undefined;

    useEffect(() => {
        if (tierId && !tier && !isEnd) {
            void fetchNextPage();
        }
    }, [fetchNextPage, isEnd, tierId, tier]);

    if (tierId && !tier) {
        return null;
    }

    return <TierDetailDialogContent key={tier?.id || "new"} tier={tier} />;
}
