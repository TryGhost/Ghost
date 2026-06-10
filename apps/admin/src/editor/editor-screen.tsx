import { Suspense, lazy, useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useParams } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import {
    getEditorPage,
    getEditorPost,
    useEditEditorPost,
    type EditorResource,
    type EditorResourceResponseType,
    type FullPost,
} from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { crossShellNavigate } from "@/utils/cross-shell-navigate";
import { getEditorAccessRedirect } from "./editor-access";
import { EditorKoenig, type KoenigEditorAPI } from "./editor-koenig";
import { EditorPostStatus } from "./publish/post-status";
import { PublishManagement } from "./publish/publish-management";
// Lazy: the settings menu pulls in admin-x-design-system + CodeMirror —
// loading that graph eagerly added seconds to the editor's first render
// (Ember's PSM also only loads when opened)
const SettingsMenu = lazy(() =>
    import("./settings-menu/settings-menu").then(m => ({ default: m.SettingsMenu }))
);
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";
import { createNewPostSnapshot, toSnapshot, useEditor } from "./use-editor";
import { useLeaveGuard } from "./use-leave-guard";

// Deduplicates the mobiledoc -> lexical conversion PUT across StrictMode
// double-mounts (a second PUT would carry a stale updated_at and 409)
const conversionPromises = new Map<string, Promise<EditorResourceResponseType>>();

export function EditorScreen({ resource }: { resource: EditorResource }) {
    const { postId } = useParams<{ postId: string }>();
    const noun = resource === "pages" ? "page" : "post";

    const handlePostCreated = useCallback((post: FullPost) => {
        // Swap /editor/post -> /editor/post/:id without notifying the router
        // (a router navigation would remount the screen and reset the editor);
        // mirrors Ember's `replaceWith` new->edit transition.
        const url = new URL(window.location.href);
        url.hash = `#/editor/${noun}/${post.id}`;
        window.history.replaceState(window.history.state, "", url);
    }, [noun]);

    const editor = useEditor({ resource, onPostCreated: handlePostCreated });
    const { state, isDirty, loadPost, updateTitle, updateLexical, saveTitle } = editor;
    const leaveGuard = useLeaveGuard(editor);

    const postQuery = getEditorPost(postId ?? "", { enabled: resource === "posts" && Boolean(postId) });
    const pageQuery = getEditorPage(postId ?? "", { enabled: resource === "pages" && Boolean(postId) });
    const loadedPost = resource === "pages" ? pageQuery.data?.pages?.[0] : postQuery.data?.posts?.[0];
    const loadError = resource === "pages" ? pageQuery.error : postQuery.error;

    const { mutateAsync: convertPost } = useEditEditorPost();
    const [conversionFailed, setConversionFailed] = useState(false);

    // authors may only open their own posts; contributors only their own
    // drafts (Ember edit route afterModel) — redirect to the list otherwise
    const { data: currentUser } = useCurrentUser();
    const accessRedirect = getEditorAccessRedirect(currentUser, loadedPost, resource);

    useEffect(() => {
        if (accessRedirect) {
            crossShellNavigate(accessRedirect, { replace: true });
        }
    }, [accessRedirect]);

    // load each post into the machine exactly once (saves update the machine
    // snapshot directly; background query refetches must not clobber edits)
    const loadedKeyRef = useRef<string | null>(null);
    const loadedKey = postId ?? "new";

    useEffect(() => {
        if (loadedKeyRef.current === loadedKey || accessRedirect) {
            return;
        }

        if (!postId) {
            loadedKeyRef.current = loadedKey;
            loadPost(createNewPostSnapshot(resource));
            return;
        }

        if (!loadedPost) {
            return;
        }

        loadedKeyRef.current = loadedKey;

        if (loadedPost.mobiledoc && !loadedPost.lexical) {
            // Mobiledoc posts are converted to lexical via a PUT with
            // ?convert_to_lexical=1, exactly like Ember's edit route
            // (ghost/admin/app/routes/lexical-editor/edit.js)
            const conversionKey = `${loadedPost.id}:${loadedPost.updated_at}`;
            let promise = conversionPromises.get(conversionKey);
            if (!promise) {
                promise = convertPost({
                    id: loadedPost.id,
                    post: { updated_at: loadedPost.updated_at },
                    resource,
                    convertToLexical: true,
                });
                conversionPromises.set(conversionKey, promise);
            }
            promise
                .then((response) => {
                    const converted = (response.posts ?? response.pages)?.[0];
                    if (converted) {
                        loadPost(toSnapshot(converted));
                    } else {
                        setConversionFailed(true);
                    }
                })
                .catch(() => setConversionFailed(true));
            return;
        }

        loadPost(toSnapshot(loadedPost));
    }, [loadedKey, postId, loadedPost, loadPost, convertPost, resource, accessRedirect]);

    const koenigApiRef = useRef<KoenigEditorAPI | null>(null);
    const registerKoenigAPI = useCallback((api: KoenigEditorAPI | null) => {
        koenigApiRef.current = api;
    }, []);

    const handleTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            koenigApiRef.current?.focusEditor({ position: "top" });
        }
    };

    const [settingsOpen, setSettingsOpen] = useState(false);

    // The editor portals to document.body and covers the viewport, but the
    // admin shell (sidebar, mobile nav) would still be left in the
    // accessibility tree and tab order behind it — and its fixed-positioned
    // mobile nav (z-50) would paint over the editor. Mark the app root inert
    // while the editor is open. The portal lives next to the app root, so
    // this never affects the editor itself or other portals (settings Sheet,
    // dialogs).
    useEffect(() => {
        const appRoot = document.getElementById("root");
        if (!appRoot) {
            return;
        }
        appRoot.setAttribute("inert", "");
        appRoot.setAttribute("aria-hidden", "true");
        return () => {
            appRoot.removeAttribute("inert");
            appRoot.removeAttribute("aria-hidden");
        };
    }, []);

    const post = state.post;
    // Latest full post data for the publish flows; save responses carry data
    // the machine doesn't model (uuid, url, email, newsletter, ...). Guarded
    // by id so a stale savedPost can never represent a different post.
    const savedFullPost = editor.savedPost && editor.savedPost.id === post?.id ? editor.savedPost : null;
    const currentFullPost = savedFullPost ?? loadedPost ?? null;

    // never render a post the user may not edit (the redirect effect above
    // navigates away; this prevents the editor flashing in the meantime)
    if (accessRedirect) {
        return null;
    }

    return createPortal(
        <div className="shade shade-admin fixed inset-0 z-50 flex bg-white" data-test-editor>
            <div className="flex min-w-0 flex-1 flex-col">
                {/* deliberately not a <header>: the preview modal's banner is
                    located via getByRole('banner') and this bar contains the
                    "Preview" trigger text that would make it an ambiguous match */}
                <div className="my-6 flex h-[34px] shrink-0 items-center justify-between gap-2 px-6">
                    <div className="flex min-w-0 items-center">
                        {/* native hash anchor (not a router Link): the click
                            must fire a real hashchange so a parked, flag-off
                            Ember list wakes; the router still sees it as a
                            POP navigation, so the leave guard applies */}
                        <a
                            className="flex h-[34px] items-center gap-1.5 rounded-md px-3 text-[1.35rem] font-medium text-[#394047] hover:bg-[#F4F5F6]"
                            data-test-breadcrumb
                            href={`#/${resource}`}
                        >
                            <LucideIcon.ChevronLeft aria-hidden="true" className="-ml-1 size-4" />
                            <span>{resource === "pages" ? "Pages" : "Posts"}</span>
                        </a>
                        <EditorPostStatus isDirty={isDirty} post={currentFullPost} state={state} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {post?.id ? (
                            <PublishManagement editor={editor} post={currentFullPost} resource={resource} />
                        ) : null}
                        <Button
                            className="h-[34px] w-[46px] text-[#394047] hover:bg-[#F4F5F6]"
                            data-testid="settings-menu-toggle"
                            title="Settings"
                            variant="ghost"
                            onClick={() => setSettingsOpen(open => !open)}
                        >
                            <LucideIcon.PanelRight aria-hidden="true" className="size-4" />
                            <span className="sr-only">Settings</span>
                        </Button>
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto">
                    {post ? (
                        <div className="mx-auto w-full max-w-[788px] px-6 pt-28 pb-16">
                            <textarea
                                className="mb-4 field-sizing-content w-full resize-none overflow-hidden border-0 bg-transparent pb-1 text-[4.8rem] leading-[1.1] font-bold tracking-[-0.017em] text-[#15171A] outline-none placeholder:text-[#CED4D9]"
                                data-test-editor-title-input
                                placeholder={resource === "pages" ? "Page title" : "Post title"}
                                rows={1}
                                tabIndex={1}
                                value={state.titleScratch}
                                onBlur={saveTitle}
                                onChange={event => updateTitle(event.target.value)}
                                onKeyDown={handleTitleKeyDown}
                            />
                            <EditorKoenig
                                key={loadedKey}
                                initialEditorState={post.lexical}
                                placeholderText={`Begin writing your ${noun}...`}
                                registerAPI={registerKoenigAPI}
                                onChange={updateLexical}
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-sm text-gray-600">
                            {conversionFailed
                                ? `This ${noun} could not be converted to the new editor format. Try refreshing the browser.`
                                : loadError
                                    ? `${resource === "pages" ? "Page" : "Post"} not found.`
                                    : "Loading..."}
                        </div>
                    )}
                </main>
            </div>

            {/* Inline, non-modal side panel (Ember PSM parity): the editor
                header (Preview/Publish/Update) must stay clickable while the
                settings are open */}
            {settingsOpen ? (
                <aside
                    aria-label={resource === "pages" ? "Page settings" : "Post settings"}
                    className="flex w-[419px] shrink-0 flex-col overflow-y-auto border-l border-[#E6E9EB] bg-white"
                    data-testid="settings-menu"
                >
                    <div className="flex h-[82px] min-h-[82px] shrink-0 items-center px-6">
                        <h2 className="text-[1.5rem] font-semibold text-[#15171A]">
                            {resource === "pages" ? "Page settings" : "Post settings"}
                        </h2>
                    </div>
                    <div className="px-6 pb-10">
                        <Suspense fallback={null}><SettingsMenu editor={editor} resource={resource} /></Suspense>
                    </div>
                </aside>
            ) : null}

            <UnsavedChangesDialog
                open={leaveGuard.isConfirming}
                onLeave={leaveGuard.leave}
                onStay={leaveGuard.stay}
            />
        </div>,
        document.body,
    );
}

// Prop-less wrappers so the routes can lazy-load the screen via FlagGatedRoute
export function PostEditor() {
    return <EditorScreen resource="posts" />;
}

export function PageEditor() {
    return <EditorScreen resource="pages" />;
}
