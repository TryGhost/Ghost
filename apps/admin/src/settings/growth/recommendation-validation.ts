import type { EditOrAddRecommendation } from "@tryghost/admin-x-framework/api/recommendations";
import type { ErrorMessages } from "@tryghost/admin-x-framework/hooks";

/**
 * Validation for the recommendation title/description form, ported from the
 * legacy recommendations/recommendation-description-form.tsx.
 */

export const validateDescriptionFormField = function (errors: ErrorMessages, field: "title" | "description", value: string | null) {
    const cloned = { ...errors };
    switch (field) {
        case "title":
            if (!value) {
                cloned.title = "Title is required";
            } else {
                delete cloned.title;
            }
            break;
        case "description":
            if (value && value.length > 200) {
                cloned.description = "Description cannot be longer than 200 characters";
            } else {
                delete cloned.description;
            }
            break;
        default: {
            // Will throw a compile error if we forget to add a case for a field
            const f: never = field;
            throw new Error(`Unknown field ${String(f)}`);
        }
    }
    return cloned;
};

export const validateDescriptionForm = function (formState: EditOrAddRecommendation) {
    let newErrors: ErrorMessages = {};
    newErrors = validateDescriptionFormField(newErrors, "title", formState.title);
    newErrors = validateDescriptionFormField(newErrors, "description", formState.description);
    return newErrors;
};
