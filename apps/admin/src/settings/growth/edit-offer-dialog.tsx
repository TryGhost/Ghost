import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, FieldLabel, Textarea } from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { type ErrorMessages, useForm } from "@tryghost/admin-x-framework/hooks";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import { type Offer, useBrowseOffersById, useEditOffer } from "@tryghost/admin-x-framework/api/offers";
import { type SiteData, getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";
import { getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes } from "@tryghost/admin-x-settings/src/utils/get-offers-portal-preview-url";
import { createOfferRedemptionFilterUrl, formatOfferTimestamp } from "@tryghost/admin-x-settings/src/components/settings/growth/offers/offer-helpers";

import { OffersBreadcrumbs } from "./offers-breadcrumbs";
import { PortalFrame } from "@/settings/membership/portal-frame";
import { type PreviewDevice, PreviewDialog } from "@/settings/site/preview-chrome";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The routed edit-offer dialog (`/settings/offers/edit/:offerId`), ported
 * from the legacy offers/edit-offer-modal.tsx onto the shared PreviewDialog
 * chrome (performance summary, editable fields, archive/reactivate).
 */

function EditOfferSidebar({ offer, errors, clearError, updateOffer, siteData }: {
    offer: Offer;
    errors: ErrorMessages;
    clearError: (field: string) => void;
    updateOffer: (fields: Partial<Offer>) => void;
    siteData: SiteData;
}) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();
    const { mutateAsync: editOffer } = useEditOffer();
    const [isCopied, setIsCopied] = useState(false);

    const [nameLength, setNameLength] = useState(offer?.name.length || 0);
    const nameLengthColor = nameLength > 40 ? "text-destructive" : "text-green";

    useEffect(() => {
        if (offer?.name) {
            setNameLength(offer?.name.length);
        }
    }, [offer?.name]);

    const homepageUrl = getHomepageUrl(siteData);
    const offerUrl = `${homepageUrl}${offer?.code}`;
    const handleCopyClick = async () => {
        await navigator.clipboard.writeText(offerUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const confirmStatusChange = () => {
        if (offer?.status === "active") {
            confirm({
                title: "Archive offer",
                prompt: (
                    <>
                        <p>New members will no longer be able to subscribe using this offer.</p>
                        <p>All members that previously redeemed <strong>{offer?.name}</strong> will remain unchanged.</p>
                    </>
                ),
                okLabel: "Archive",
                destructive: true,
                onOk: async () => {
                    try {
                        await editOffer({ ...offer, status: "archived" });
                        showToast({
                            type: "success",
                            title: "Offer archived",
                        });
                        navigate("/settings/offers/edit");
                    } catch (e) {
                        handleError(e);
                        throw e;
                    }
                },
            });
        } else {
            confirm({
                title: "Reactivate offer",
                prompt: <p>Reactivating <strong>{offer?.name}</strong> will allow new members to subscribe using this offer. Existing members will remain unchanged.</p>,
                okLabel: "Reactivate",
                onOk: async () => {
                    try {
                        await editOffer({ ...offer, status: "active" });
                        showToast({
                            type: "success",
                            title: "Offer reactivated",
                        });
                        navigate("/settings/offers/edit");
                    } catch (e) {
                        handleError(e);
                        throw e;
                    }
                },
            });
        }
    };

    return (
        <div className="flex grow flex-col pt-2">
            <div className="flex grow flex-col gap-8">
                <section>
                    <div className="flex flex-col gap-5 rounded-md border border-border p-4 pb-3.5">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm leading-none font-semibold text-muted-foreground">Created on</span>
                            <span>{formatOfferTimestamp(offer?.created_at ? offer.created_at : "")}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm leading-none font-semibold text-muted-foreground">Performance</span>
                                    <span>{formatNumber(offer?.redemption_count || 0)} {offer?.redemption_count === 1 ? "redemption" : "redemptions"}</span>
                                </div>
                                {offer?.redemption_count > 0 && offer?.last_redeemed ? (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-sm leading-none font-semibold text-muted-foreground">Last redemption</span>
                                        <span>{formatOfferTimestamp(offer?.last_redeemed)}</span>
                                    </div>
                                ) : null}
                            </div>
                            {offer?.redemption_count > 0 ? <a className="font-semibold text-primary" href={createOfferRedemptionFilterUrl(offer?.id)}>See members &rarr;</a> : null}
                        </div>
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-lg font-semibold tracking-tight">General</h2>
                    <div className="flex flex-col gap-6">
                        <TextField
                            error={Boolean(errors.name)}
                            hint={errors.name || <span className="flex justify-between"><span>Visible to members on Stripe Checkout page</span><strong><span className={nameLengthColor}>{formatNumber(nameLength)}</span> / {formatNumber(40)}</strong></span>}
                            maxLength={40}
                            placeholder="Black Friday"
                            title="Offer name"
                            value={offer?.name ?? ""}
                            onChange={(e) => {
                                setNameLength(e.target.value.length);
                                updateOffer({ name: e.target.value });
                            }}
                            onKeyDown={() => clearError("name")}
                        />
                        <TextField
                            error={Boolean(errors.code)}
                            hint={errors.code || (offer?.code !== "" ? <span className="block truncate text-muted-foreground">{homepageUrl}<span className="font-bold text-foreground">{offer?.code}</span></span> : null)}
                            placeholder="black-friday"
                            rightAddon={offer?.code !== "" ? <Button size="sm" variant="link" onClick={() => void handleCopyClick()}>{isCopied ? "Copied!" : "Copy link"}</Button> : null}
                            title="Offer code"
                            value={offer?.code ?? ""}
                            onChange={(e) => updateOffer({ code: e.target.value })}
                            onKeyDown={() => clearError("code")}
                        />
                        <TextField
                            error={Boolean(errors.displayTitle)}
                            hint={errors.displayTitle}
                            placeholder="Black Friday Special"
                            title="Display title"
                            value={offer?.display_title ?? ""}
                            onChange={(e) => updateOffer({ display_title: e.target.value })}
                            onKeyDown={() => clearError("displayTitle")}
                        />
                        <Field>
                            <FieldLabel htmlFor="offer-display-description">Display description</FieldLabel>
                            <Textarea className="border-transparent bg-muted" id="offer-display-description" placeholder="Take advantage of this limited-time offer." value={offer?.display_description ?? ""} onChange={(e) => updateOffer({ display_description: e.target.value })} />
                        </Field>
                    </div>
                </section>
            </div>
            <div className="mt-6 mb-2">
                {offer?.status === "active"
                    ? <Button className="px-0 text-destructive" variant="link" onClick={confirmStatusChange}>Archive offer</Button>
                    : <Button className="px-0 text-primary" variant="link" onClick={confirmStatusChange}>Reactivate offer</Button>}
            </div>
        </div>
    );
}

function EditOfferDialogContent({ offer, siteData }: { offer: Offer; siteData: SiteData }) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();
    const { mutateAsync: editOffer } = useEditOffer();

    const [href, setHref] = useState<string>("");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

    const { formState, saveState, updateForm, setFormState, handleSave, errors, clearError, okProps } = useForm({
        initialState: offer,
        savingDelay: 500,
        onSave: async (state) => {
            await editOffer(state);
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors: Record<string, string> = {};

            if (!state?.name) {
                newErrors.name = "Name is required";
            }

            if (!state?.display_title) {
                newErrors.displayTitle = "Display title is required";
            }

            if (!state?.code) {
                newErrors.code = "Please enter a code";
            }

            return newErrors;
        },
    });

    // Reset to the fresh API record when it changes (the legacy contract).
    useEffect(() => {
        setFormState(() => offer);
    }, [setFormState, offer]);

    const updateOffer = (fields: Partial<Offer>) => {
        updateForm((state) => ({ ...state, ...fields }));
    };

    useEffect(() => {
        const dataset: offerPortalPreviewUrlTypes = {
            name: formState?.name || "",
            code: formState?.code || "",
            displayTitle: formState?.display_title || "",
            displayDescription: formState?.display_description || "",
            type: formState?.type || "",
            cadence: formState?.cadence || "",
            amount: formState?.amount,
            duration: formState?.duration || "",
            durationInMonths: formState?.duration_in_months || 0,
            currency: formState?.currency || "",
            status: formState?.status || "",
            tierId: formState?.tier?.id || "",
            redemptionType: "signup",
        };

        const newHref = getOfferPortalPreviewUrl(dataset, siteData.url);
        setHref(newHref);
    }, [formState, siteData]);

    const goBack = () => {
        navigate("/settings/offers/edit");
    };

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", goBack);
    };

    const onOk = async () => {
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
                    message: "Please try again later",
                });
            }
        }
    };

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            cancelLabel="Cancel"
            device={previewDevice}
            okLabel={okProps.label || "Save"}
            preview={<PortalFrame href={href || ""} selectedTab="offers" />}
            previewToolbarTabs={<OffersBreadcrumbs current={formState?.name || "Offer"} onBack={goBack} />}
            sidebar={(
                <EditOfferSidebar
                    clearError={clearError}
                    errors={errors}
                    offer={formState}
                    siteData={siteData}
                    updateOffer={updateOffer}
                />
            )}
            testId="offer-update-modal"
            title="Offer"
            onClose={requestClose}
            onDeviceChange={setPreviewDevice}
            onOk={() => void onOk()}
        />
    );
}

export function EditOfferDialog() {
    const { offerId } = useParams();
    const { data: siteResponse } = useBrowseSite();
    const { data: { offers: offerById = [] } = {} } = useBrowseOffersById(offerId || "");

    if (!siteResponse || !offerById[0]) {
        return null;
    }

    return <EditOfferDialogContent offer={offerById[0]} siteData={siteResponse.site} />;
}
