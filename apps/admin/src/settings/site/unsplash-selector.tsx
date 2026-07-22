import { UnsplashSearchModal, type InsertImagePayload } from "@tryghost/kg-unsplash-selector";
import { useFramework } from "@tryghost/admin-x-framework";

/**
 * The Unsplash photo browser. Rendered inline (inside the design dialog's
 * Radix content) rather than portalled to body — the modal dialog blocks
 * pointer events on outside portals, and its full-screen content gives the
 * browser's fixed positioning the whole viewport anyway.
 */
export function UnsplashSelector({ onClose, onImageInsert }: {
    onClose: () => void;
    onImageInsert: (image: InsertImagePayload) => void;
}) {
    const { unsplashConfig } = useFramework();

    return (
        <UnsplashSearchModal
            unsplashProviderConfig={unsplashConfig}
            onClose={onClose}
            onImageInsert={onImageInsert}
        />
    );
}
