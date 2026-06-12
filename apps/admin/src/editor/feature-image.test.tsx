import { useRef, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanCaptionHtml } from "./caption-html";
import { EditorFeatureImage } from "./feature-image";
import type { KoenigHtmlInputProps } from "./editor-koenig";
import {
    createDefaultPostSettings,
    createInitialState,
    transition,
    type EditorEffect,
    type PostSnapshot,
} from "./state";
import type { UseEditorResult } from "./use-editor";

const mocks = vi.hoisted(() => ({
    upload: vi.fn<(files: FileList | ReadonlyArray<File>) => Promise<Array<{ url?: string; fileName: string }> | null>>(),
    uploadErrors: [] as Array<{ fileName: string; message: string }>,
    captionProps: { current: null as KoenigHtmlInputProps | null },
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    useKoenigFileUpload: () => ({
        upload: mocks.upload,
        isLoading: false,
        progress: 0,
        filesNumber: 0,
        errors: mocks.uploadErrors,
    }),
}));

// the caption editor is a Koenig minimal editor loaded from a real ESM
// bundle; record its props so tests can drive onChangeHtml/onBlur
vi.mock("./editor-koenig", () => ({
    KoenigHtmlInput: (props: KoenigHtmlInputProps) => {
        mocks.captionProps.current = props;
        return <div data-testid="mock-caption-editor">{props.html}</div>;
    },
}));

function makePost(overrides: Partial<PostSnapshot> = {}): PostSnapshot {
    return {
        id: "post-1",
        status: "draft",
        title: "My post",
        lexical: null,
        customExcerpt: null,
        slug: "my-post",
        tags: [],
        publishedAt: null,
        featureImage: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
        settings: createDefaultPostSettings(),
        ...overrides,
    };
}

/**
 * Renders the component against the real editor machine: dispatches run real
 * transitions and the emitted effects are recorded for assertions.
 */
function Harness({ post, effectsLog }: { post: PostSnapshot; effectsLog: EditorEffect[] }) {
    const [state, setState] = useState(
        () => transition(createInitialState(), { type: "POST_LOADED", post }).state,
    );
    const stateRef = useRef(state);

    const editor = {
        state,
        dispatch: (event: Parameters<typeof transition>[1]) => {
            const result = transition(stateRef.current, event);
            stateRef.current = result.state;
            effectsLog.push(...result.effects);
            setState(result.state);
        },
    } as unknown as UseEditorResult;

    return <EditorFeatureImage editor={editor} />;
}

function setup(postOverrides: Partial<PostSnapshot> = {}) {
    const effectsLog: EditorEffect[] = [];
    render(<Harness effectsLog={effectsLog} post={makePost(postOverrides)} />);
    return { effectsLog };
}

function savePayloads(effectsLog: EditorEffect[]) {
    return effectsLog
        .filter(effect => effect.type === "save/perform")
        .map(effect => effect.payload);
}

const IMAGE_POST: Partial<PostSnapshot> = {
    featureImage: "https://example.com/image.jpg",
    settings: {
        ...createDefaultPostSettings(),
        featureImageAlt: "A skyline",
        featureImageCaption: "Photo by someone",
    },
};

describe("EditorFeatureImage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.uploadErrors = [];
        mocks.captionProps.current = null;
    });

    describe("empty state", () => {
        it("shows the add button and no preview", () => {
            setup();

            expect(screen.getByTestId("feature-image-add")).toHaveTextContent("Add feature image");
            expect(document.querySelector("img")).toBeNull();
            expect(mocks.captionProps.current).toBeNull();
        });

        it("uploads the chosen file, sets the image and saves (Ember setFeatureImage)", async () => {
            mocks.upload.mockResolvedValue([{ url: "https://example.com/uploaded.jpg", fileName: "uploaded.jpg" }]);
            const { effectsLog } = setup();

            const fileInput = document.querySelector('[data-test-file-input="feature-image"]') as HTMLInputElement;
            fireEvent.change(fileInput, {
                target: { files: [new File(["data"], "uploaded.jpg", { type: "image/jpeg" })] },
            });

            await waitFor(() => {
                expect(screen.getByTestId("feature-image-preview")).toHaveAttribute("src", "https://example.com/uploaded.jpg");
            });
            const payloads = savePayloads(effectsLog);
            expect(payloads).toHaveLength(1);
            expect(payloads[0].featureImage).toBe("https://example.com/uploaded.jpg");
        });

        it("shows upload errors", () => {
            mocks.uploadErrors = [{ fileName: "huge.tiff", message: "The file type you uploaded is not supported." }];
            setup();

            expect(document.querySelector('[data-test-error="feature-image"]'))
                .toHaveTextContent("The file type you uploaded is not supported.");
        });
    });

    describe("with an image", () => {
        it("renders the preview with alt text and the caption editor", () => {
            setup(IMAGE_POST);

            expect(screen.getByAltText("A skyline")).toHaveAttribute("src", "https://example.com/image.jpg");
            // stored captions get wrapped in a paragraph for Lexical (Ember `get caption`)
            expect(mocks.captionProps.current?.html).toBe("<p>Photo by someone</p>");
            expect(screen.queryByTestId("feature-image-add")).toBeNull();
        });

        it("clears image, alt and caption together on delete (Ember clearFeatureImage)", () => {
            const { effectsLog } = setup(IMAGE_POST);

            fireEvent.click(screen.getByTestId("feature-image-delete"));

            expect(screen.getByTestId("feature-image-add")).toBeInTheDocument();
            const payloads = savePayloads(effectsLog);
            expect(payloads).toHaveLength(1);
            expect(payloads[0].featureImage).toBeNull();
            expect(payloads[0].settings.featureImageAlt).toBeNull();
            expect(payloads[0].settings.featureImageCaption).toBeNull();
        });

        it("does not autosave published posts (background saves are drafts-only)", () => {
            const { effectsLog } = setup({ ...IMAGE_POST, status: "published" });

            fireEvent.click(screen.getByTestId("feature-image-delete"));

            expect(savePayloads(effectsLog)).toHaveLength(0);
        });

        it("edits the alt text behind the Alt toggle and saves on blur", () => {
            const { effectsLog } = setup(IMAGE_POST);

            fireEvent.click(screen.getByTestId("feature-image-alt-toggle"));
            const altInput = screen.getByTestId("feature-image-alt-input");
            expect(altInput).toHaveValue("A skyline");
            // the caption editor is swapped out while editing alt
            expect(screen.queryByTestId("mock-caption-editor")).toBeNull();

            fireEvent.change(altInput, { target: { value: "New alt text" } });
            expect(savePayloads(effectsLog)).toHaveLength(0);

            fireEvent.blur(altInput);
            const payloads = savePayloads(effectsLog);
            expect(payloads).toHaveLength(1);
            expect(payloads[0].settings.featureImageAlt).toBe("New alt text");

            // toggling back restores the caption editor
            fireEvent.click(screen.getByTestId("feature-image-alt-toggle"));
            expect(screen.getByTestId("mock-caption-editor")).toBeInTheDocument();
        });

        it("commits caption changes and saves on blur", () => {
            const { effectsLog } = setup(IMAGE_POST);

            act(() => mocks.captionProps.current?.onChangeHtml("<p>New <strong>caption</strong></p>"));
            act(() => mocks.captionProps.current?.onBlur?.());

            const payloads = savePayloads(effectsLog);
            expect(payloads).toHaveLength(1);
            expect(payloads[0].settings.featureImageCaption).toBe("New <strong>caption</strong>");
        });

        it("ignores Lexical's load-time caption normalization (no dirty state)", () => {
            const { effectsLog } = setup(IMAGE_POST);

            // Lexical wraps plain text in white-space:pre-wrap spans on load
            act(() => mocks.captionProps.current?.onChangeHtml('<p><span style="white-space: pre-wrap;">Photo by someone</span></p>'));
            act(() => mocks.captionProps.current?.onBlur?.());

            expect(savePayloads(effectsLog)).toHaveLength(0);
        });
    });

    it("shows the hidden indicator when a page hides title + feature image", () => {
        setup({
            ...IMAGE_POST,
            settings: { ...IMAGE_POST.settings!, showTitleAndFeatureImage: false },
        });

        expect(screen.getByTitle("Feature image and post title are hidden on page")).toBeInTheDocument();
        expect(screen.getByAltText("A skyline")).toHaveClass("opacity-50");
    });
});

describe("cleanCaptionHtml", () => {
    it("unwraps a single paragraph (stored captions are inner content)", () => {
        expect(cleanCaptionHtml("<p>Hello <b>world</b></p>")).toBe("Hello <b>world</b>");
    });

    it("strips Lexical's plain-text pre-wrap spans", () => {
        expect(cleanCaptionHtml('<p><span style="white-space: pre-wrap;">Hello</span></p>')).toBe("Hello");
    });

    it("keeps meaningful spans and multiple paragraphs", () => {
        expect(cleanCaptionHtml('<span style="color: red;">Hi</span>')).toBe('<span style="color: red;">Hi</span>');
        expect(cleanCaptionHtml("<p>One</p><p>Two</p>")).toBe("<p>One</p><p>Two</p>");
    });

    it("handles empty values", () => {
        expect(cleanCaptionHtml(null)).toBe("");
        expect(cleanCaptionHtml("")).toBe("");
        expect(cleanCaptionHtml("<p></p>")).toBe("");
    });
});
