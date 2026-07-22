import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LoadingIndicator,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { AlreadyExistsError } from "@tryghost/admin-x-framework/errors";
import { type EditOrAddRecommendation, useAddRecommendation, useCheckRecommendation } from "@tryghost/admin-x-framework/api/recommendations";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { formatUrl } from "@tryghost/admin-x-settings/src/utils/format-url";

import { RecommendationDescriptionForm } from "./recommendation-description-form";
import { validateDescriptionForm } from "./recommendation-validation";
import { TextField } from "@/settings/app/shared/text-field";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The routed add-recommendation flow (`/settings/recommendations/add`),
 * ported from the legacy add-recommendation-modal(-confirm) pair as one
 * dialog with two steps: URL → metadata check (`/recommendations/check/`)
 * → confirm form → create. A `?url=` search param (the recommend-back flow)
 * auto-submits the first step behind a loading view.
 */

type DraftRecommendation = EditOrAddRecommendation;

const doFormatUrl = (url: string) => {
    return formatUrl(url).save || "";
};

const validateUrl = function (errors: Record<string, string>, url: string) {
    try {
        const u = new URL(url);

        // Check domain includes a dot
        if (!u.hostname.includes(".")) {
            errors.url = "Enter a valid URL";
        } else {
            delete errors.url;
        }
    } catch {
        errors.url = "Enter a valid URL";
    }
    return errors;
};

function UrlStep({ recommendation, initialUrl, onNext, onClose }: {
    recommendation: DraftRecommendation | null;
    initialUrl: string;
    onNext: (recommendation: DraftRecommendation) => void;
    onClose: () => void;
}) {
    const [enterPressed, setEnterPressed] = useState(false);
    const { mutateAsync: checkRecommendation } = useCheckRecommendation();

    // Show loading view when we had an initial URL
    const didInitialSubmit = useRef(false);
    const [showLoadingView, setShowLoadingView] = useState(!!initialUrl);

    const { formState, updateForm, handleSave, errors, saveState, clearError } = useForm<DraftRecommendation>({
        initialState: recommendation ?? {
            title: "",
            url: initialUrl || "",
            description: "",
            excerpt: null,
            featured_image: null,
            favicon: null,
            one_click_subscribe: false,
        },
        onSave: async () => {
            const validatedUrl: URL = new URL(formState.url);

            // Use the hostname as fallback title
            const defaultTitle = validatedUrl.hostname.replace("www.", "");

            const updatedRecommendation = {
                ...formState,
                url: validatedUrl.toString(),
            };

            // Check if the recommendation already exists, or fetch metadata if it's a new recommendation
            const { recommendations = [] } = await checkRecommendation(validatedUrl);

            if (!recommendations || recommendations.length === 0) {
                // Oops! Failed to fetch metadata
                return;
            }

            const existing = recommendations[0];

            if (existing.id) {
                throw new AlreadyExistsError("A recommendation with this URL already exists.");
            }

            // Update metadata so we can preview it
            updatedRecommendation.title = existing.title ?? defaultTitle;
            updatedRecommendation.excerpt = existing.excerpt ?? updatedRecommendation.excerpt;
            updatedRecommendation.featured_image = existing.featured_image ?? updatedRecommendation.featured_image ?? null;
            updatedRecommendation.favicon = existing.favicon ?? updatedRecommendation.favicon ?? null;
            updatedRecommendation.one_click_subscribe = existing.one_click_subscribe ?? updatedRecommendation.one_click_subscribe ?? false;

            // Set a default description (excerpt)
            updatedRecommendation.description = updatedRecommendation.excerpt || null;

            onNext(updatedRecommendation);
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            validateUrl(newErrors, formState.url);

            // If we have errors: close direct submit view
            if (showLoadingView) {
                setShowLoadingView(Object.keys(newErrors).length === 0);
            }

            return newErrors;
        },
    });

    const onOk = useCallback(async () => {
        if (saveState === "saving") {
            // Already saving
            return;
        }

        toast.dismiss();
        try {
            if (await handleSave({ force: true })) {
                return;
            }
        } catch (e) {
            const message = e instanceof AlreadyExistsError ? e.message : "Something went wrong while checking this URL, please try again.";
            showToast({
                type: "error",
                title: message,
            });
        }

        // If we have errors: close direct submit view
        if (showLoadingView) {
            setShowLoadingView(false);
        }
    }, [handleSave, saveState, showLoadingView, setShowLoadingView]);

    // Make sure we submit initially when opening in loading view state
    useEffect(() => {
        if (showLoadingView && !didInitialSubmit.current) {
            didInitialSubmit.current = true;
            void onOk();
        }
    }, [showLoadingView, onOk]);

    useEffect(() => {
        if (enterPressed) {
            void onOk();
            setEnterPressed(false); // Reset for future use
        }

    }, [formState]);

    if (showLoadingView) {
        return (
            <Dialog open onOpenChange={(open) => !open && onClose()}>
                <DialogContent aria-describedby={undefined} className="max-w-[540px]" data-testid="add-recommendation-modal">
                    <DialogTitle className="sr-only">Add recommendation</DialogTitle>
                    <div className="flex flex-col items-center justify-center p-8">
                        <div className="flex h-64 items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-[540px] overflow-y-auto" data-testid="add-recommendation-modal">
                <DialogHeader>
                    <DialogTitle>Add recommendation</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    <p>You can recommend <strong>any site</strong> your audience will find valuable, not just those published on Ghost.</p>
                    <TextField
                        error={Boolean(errors.url)}
                        hint={errors.url || <>Need inspiration? <a className="text-primary" href="https://www.ghost.org/explore" rel="noopener noreferrer" target="_blank">Explore thousands of sites</a> to recommend</>}
                        maxLength={2000}
                        placeholder="https://www.example.com"
                        title="URL"
                        value={formState.url}
                        autoFocus
                        onBlur={() => {
                            const url = doFormatUrl(formState.url);
                            updateForm((state) => ({ ...state, url: url }));
                        }}
                        onChange={(e) => {
                            clearError?.("url");
                            updateForm((state) => ({ ...state, url: e.target.value }));
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                updateForm((state) => ({ ...state, url: doFormatUrl(formState.url) }));
                                setEnterPressed(true);
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={saveState === "saving"} onClick={() => void onOk()}>
                        {saveState === "saving" ? "Next..." : "Next"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ConfirmStep({ recommendation, onBack, onClose }: {
    recommendation: DraftRecommendation;
    onBack: (recommendation: DraftRecommendation) => void;
    onClose: () => void;
}) {
    const { mutateAsync: addRecommendation } = useAddRecommendation();
    const handleError = useSettingsHandleError();

    const { formState, updateForm, handleSave, saveState, errors, clearError, setErrors } = useForm<DraftRecommendation>({
        initialState: {
            ...recommendation,
        },
        onSave: async (state) => {
            await addRecommendation(state);
            showToast({
                title: "Recommendation added",
                type: "success",
            });
            onClose();
        },
        onSaveError: handleError,
        onValidate: (state) => {
            return validateDescriptionForm(state);
        },
    });

    let okLabel = "Add";
    if (saveState === "saved") {
        okLabel = "Added";
    }

    const onOk = async () => {
        if (saveState === "saving") {
            // Already saving
            return;
        }

        toast.dismiss();
        try {
            await handleSave({ force: true });
        } catch {
            showToast({
                type: "error",
                title: "Something went wrong when adding this recommendation, please try again.",
            });
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-[540px] overflow-y-auto" data-testid="add-recommendation-modal">
                <DialogHeader>
                    <DialogTitle>Add recommendation</DialogTitle>
                </DialogHeader>
                <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={false} updateForm={updateForm} />
                <DialogFooter className="sm:justify-between">
                    <Button
                        className="px-0"
                        variant="link"
                        onClick={() => {
                            if (saveState === "saving") {
                                // Already saving
                                return;
                            }
                            onBack(formState);
                        }}
                    >
                        <LucideIcon.ArrowLeft className="size-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            if (saveState === "saving") {
                                return;
                            }
                            onClose();
                        }}>Cancel</Button>
                        <Button disabled={saveState === "saving"} onClick={() => void onOk()}>
                            {saveState === "saving" ? "Adding..." : okLabel}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AddRecommendationDialog() {
    const navigate = useNavigate();
    const { search } = useLocation();

    // Handle a URL that was passed via the route (the recommend-back flow)
    const initialUrl = new URLSearchParams(search).get("url") ?? "";
    const { save: initialUrlCleaned } = initialUrl ? formatUrl(initialUrl) : { save: "" };

    const [step, setStep] = useState<"url" | "confirm">("url");
    const [draft, setDraft] = useState<DraftRecommendation | null>(null);

    const close = () => navigate("/settings/recommendations");

    if (step === "confirm" && draft) {
        return (
            <ConfirmStep
                recommendation={draft}
                onBack={(state) => {
                    setDraft(state);
                    setStep("url");
                }}
                onClose={close}
            />
        );
    }

    return (
        <UrlStep
            initialUrl={draft ? "" : (initialUrlCleaned || "")}
            recommendation={draft}
            onClose={close}
            onNext={(state) => {
                setDraft(state);
                setStep("confirm");
            }}
        />
    );
}
