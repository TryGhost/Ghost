import { useRef, useState, type ChangeEvent } from "react";
import { useKoenigFileUpload } from "@tryghost/admin-x-framework";
import { LucideIcon } from "@tryghost/shade/utils";
import { cleanCaptionHtml, wrapCaption } from "./caption-html";
import { KoenigHtmlInput } from "./editor-koenig";
import type { UseEditorResult } from "./use-editor";

/**
 * Canvas feature image (port of Ember's gh-editor-feature-image): the image
 * preview with delete action plus the alt text / caption inputs, rendered
 * above the post title. Documented deviations: no Unsplash picker, no
 * image editor (pintura) and no drag-drop/TK support; saves happen on
 * commit/blur instead of Ember's debounced autosave.
 */

export function EditorFeatureImage({ editor }: { editor: UseEditorResult }) {
    const { state, dispatch } = editor;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { upload, isLoading, errors } = useKoenigFileUpload("image");
    const [isEditingAlt, setIsEditingAlt] = useState(false);

    const image = state.featureImageScratch;
    const alt = state.settingsScratch.featureImageAlt ?? "";
    const caption = state.settingsScratch.featureImageCaption;
    // pages can hide the title + feature image via the PSM toggle
    const isHidden = state.settingsScratch.showTitleAndFeatureImage === false;

    // Ember setFeatureImage/clearFeatureImage/setFeatureImageAlt save drafts
    // via the (debounced) autosave task; the machine ignores background saves
    // for non-drafts, exactly like Ember's _canAutosave
    const requestAutosave = () => {
        if (state.post?.id) {
            dispatch({ type: "SAVE_REQUESTED", kind: "autosave" });
        }
    };

    const setImage = (url: string) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "featureImage", value: url });
        requestAutosave();
    };

    const clearImage = () => {
        dispatch({ type: "SCRATCH_CHANGED", field: "featureImage", value: null });
        dispatch({ type: "SETTINGS_CHANGED", settings: { featureImageAlt: null, featureImageCaption: null } });
        setIsEditingAlt(false);
        requestAutosave();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }
        const results = await upload(files);
        event.target.value = "";
        const url = results?.[0]?.url;
        if (url) {
            setImage(url);
        }
    };

    const updateCaption = (html: string) => {
        const cleaned = cleanCaptionHtml(html);
        // ignore Lexical's load-time normalization (Ember setCaption no-ops
        // when the normalized values match)
        if (cleaned === cleanCaptionHtml(wrapCaption(caption))) {
            return;
        }
        dispatch({ type: "SETTINGS_CHANGED", settings: { featureImageCaption: cleaned || null } });
    };

    return (
        <div className="relative mb-2 min-h-[60px] w-full" data-testid="feature-image-canvas">
            <input
                ref={fileInputRef}
                accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                className="hidden"
                data-test-file-input="feature-image"
                type="file"
                onChange={event => void handleFileChange(event)}
            />

            {image ? (
                <>
                    {isHidden ? (
                        <span
                            className="absolute top-2 -left-10 text-[#7C8B9A]"
                            title="Feature image and post title are hidden on page"
                        >
                            <LucideIcon.EyeOff aria-hidden="true" className="size-5" />
                        </span>
                    ) : null}
                    <div className="group relative w-fit max-w-full">
                        {/* natural size capped at the column width (Ember doesn't stretch small images) */}
                        <img
                            alt={alt}
                            className={`block max-w-full ${isHidden ? "opacity-50" : ""}`}
                            data-testid="feature-image-preview"
                            src={image}
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 to-transparent to-40% opacity-0 transition-opacity group-hover:opacity-100"
                        />
                        <button
                            className="absolute top-[10px] right-[10px] flex h-[3.2rem] w-[3.6rem] items-center justify-center rounded-md bg-white text-[#394047] opacity-0 transition-opacity group-hover:opacity-85 hover:text-red-600 hover:opacity-100"
                            data-testid="feature-image-delete"
                            title="Delete"
                            type="button"
                            onClick={clearImage}
                        >
                            <LucideIcon.Trash2 aria-hidden="true" className="size-4" />
                            <span className="sr-only">Delete feature image</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-3">
                        {isEditingAlt ? (
                            <input
                                autoFocus
                                aria-label="Alt text for feature image"
                                className={`w-full border-0 bg-transparent text-[1.4rem] leading-[24px] tracking-[.04rem] text-[#394047] outline-none placeholder:text-[#ABB4BE] ${isHidden ? "opacity-50" : ""}`}
                                data-testid="feature-image-alt-input"
                                name="alt"
                                placeholder="Add alt text to the feature image"
                                type="text"
                                value={alt}
                                onBlur={requestAutosave}
                                onChange={event => dispatch({
                                    type: "SETTINGS_CHANGED",
                                    settings: { featureImageAlt: event.target.value || null },
                                })}
                            />
                        ) : (
                            // gh-editor-feature-image-caption: Ember's global CSS forces
                            // the Koenig input to inherit this row's font instead of the
                            // editor's serif (same stylesheet that styles the rest of the
                            // admin shell around this portal)
                            <div
                                className={`gh-editor-feature-image-caption w-full font-sans text-[1.4rem] leading-[24px] tracking-[.04rem] text-[#394047] ${isHidden ? "opacity-50" : ""}`}
                                data-testid="feature-image-caption"
                            >
                                <KoenigHtmlInput
                                    html={wrapCaption(caption)}
                                    placeholderText="Add a caption to the feature image"
                                    onBlur={requestAutosave}
                                    onChangeHtml={updateCaption}
                                />
                            </div>
                        )}
                        <button
                            className={`h-full shrink-0 rounded-md border px-2 py-1 font-sans text-[1.1rem] font-normal tracking-[.06rem] ${isEditingAlt ? "border-[#30CF43] bg-[#30CF43] text-white" : "border-[#CED4D9] bg-white text-[#7C8B9A]"}`}
                            data-testid="feature-image-alt-toggle"
                            title="Toggle between editing alt text and caption"
                            type="button"
                            onClick={() => setIsEditingAlt(editing => !editing)}
                        >
                            Alt
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex flex-row items-center">
                    <button
                        className="flex items-center gap-1.5 text-[1.35rem] font-normal tracking-[.2px] text-[#7C8B9A] hover:text-[#54666D]"
                        data-testid="feature-image-add"
                        disabled={isLoading}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <LucideIcon.Plus aria-hidden="true" className="size-3" />
                        <span>{isLoading ? "Uploading..." : "Add feature image"}</span>
                    </button>
                </div>
            )}

            {errors.map(uploadError => (
                <p key={uploadError.fileName} className="mt-1 text-sm text-red-600" data-test-error="feature-image">
                    {uploadError.message}
                </p>
            ))}
        </div>
    );
}
