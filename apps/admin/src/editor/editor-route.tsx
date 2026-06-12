import { lazy } from "react";
import { FlagGatedRoute } from "@/flag-gated-route";

const PostEditor = lazy(() => import("./editor-screen").then(module => ({ default: module.PostEditor })));
const PageEditor = lazy(() => import("./editor-screen").then(module => ({ default: module.PageEditor })));

// Renders the React editor when the editorX labs flag is enabled, and the
// Ember editor otherwise. The React screen renders fullscreen via a portal to
// document.body (same pattern as the settings route), so it covers the
// AdminLayout sidebar; the Ember fallback manages its own fullscreen state.
export function PostEditorRoute() {
    return <FlagGatedRoute component={PostEditor} flag="editorX" />;
}

export function PageEditorRoute() {
    return <FlagGatedRoute component={PageEditor} flag="editorX" />;
}
