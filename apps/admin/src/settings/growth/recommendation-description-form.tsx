import { useEffect, useRef, useState } from "react";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import type { EditOrAddRecommendation } from "@tryghost/admin-x-framework/api/recommendations";
import type { ErrorMessages } from "@tryghost/admin-x-framework/hooks";

import { RecommendationIcon } from "./recommendation-icon";
import { validateDescriptionForm } from "./recommendation-validation";
import { TextField } from "@/settings/app/shared/text-field";

/**
 * The shared title/description form + preview card used by the add-confirm
 * and edit recommendation dialogs, ported from the legacy
 * recommendations/recommendation-description-form.tsx (validation lives in
 * recommendation-validation.ts). The preview card is a fixed-light surface
 * by design.
 */

export function RecommendationDescriptionForm<T extends EditOrAddRecommendation>({ showURL, formState, updateForm, errors, clearError, setErrors }: {
    showURL?: boolean;
    formState: T;
    errors: ErrorMessages;
    updateForm: (fn: (state: T) => T) => void;
    clearError?: (key: string) => void;
    setErrors: (errors: ErrorMessages) => void;
}) {
    const [descriptionLength, setDescriptionLength] = useState(formState?.description?.length || 0);
    const descriptionLengthColor = descriptionLength > 200 ? "text-destructive" : "text-foreground";

    // Do an initial validation on mounting
    const didValidate = useRef(false);
    useEffect(() => {
        if (didValidate.current) {
            return;
        }
        didValidate.current = true;
        setErrors(validateDescriptionForm(formState));
    }, [formState, setErrors]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h6 className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">Preview</h6>
                <div className="-mx-6 flex items-center justify-center overflow-hidden border-y border-border bg-muted px-7 py-4">
                    <div className="w-full rounded bg-white py-3 shadow">
                        <a className="flex items-center justify-between bg-white px-5 py-3" href={formState.url} rel="noopener noreferrer" target="_blank">
                            <div className="flex flex-col gap-[2px]">
                                <div className="flex items-start gap-2">
                                    <RecommendationIcon favicon={formState.favicon} featuredImage={formState.featured_image} isGhostSite={formState.one_click_subscribe} title={formState.title ?? formState.url} />
                                    <span className="text-[1.05rem] font-semibold text-gray-900">{formState.title}</span>
                                </div>
                                {formState.description && <span className="pl-[31px] text-sm leading-snug text-gray-600">{formState.description}</span>}
                            </div>
                            {formState.one_click_subscribe && <span className="flex pl-6 text-md font-semibold whitespace-nowrap text-green">Subscribe</span>}
                        </a>
                    </div>
                </div>
                {formState.one_click_subscribe && <FieldDescription className="mt-1">This is a Ghost site, so your readers can subscribe with just one click</FieldDescription>}
            </div>

            {showURL && (
                <Field data-disabled="true">
                    <FieldLabel htmlFor="recommendation-url">URL</FieldLabel>
                    <Input className="border-transparent bg-muted" id="recommendation-url" value={formState.url} disabled />
                </Field>
            )}

            <TextField
                error={Boolean(errors.title)}
                hint={errors.title}
                maxLength={2000}
                title="Title"
                value={formState.title ?? ""}
                onChange={(e) => {
                    clearError?.("title");
                    updateForm((state) => ({ ...state, title: e.target.value }));
                }}
            />
            <Field data-invalid={Boolean(errors.description) || undefined}>
                <FieldLabel htmlFor="recommendation-description">Short description</FieldLabel>
                <Textarea
                    aria-invalid={Boolean(errors.description) || undefined}
                    className="border-transparent bg-muted"
                    id="recommendation-description"
                    rows={4}
                    value={formState.description ?? ""}
                    onChange={(e) => {
                        clearError?.("description");
                        setDescriptionLength(e.target.value.length);
                        updateForm((state) => ({ ...state, description: e.target.value }));
                    }}
                />
                <FieldDescription>Max: <strong>{formatNumber(200)}</strong> characters. You&#8217;ve used <strong className={descriptionLengthColor}>{formatNumber(descriptionLength)}</strong></FieldDescription>
            </Field>
        </div>
    );
}
