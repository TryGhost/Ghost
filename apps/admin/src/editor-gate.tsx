import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { lazyEditorScreen } from './editor/api';

/**
 * Serves `/editor/*` — new (`:type`) and edit (`:type/:postId`) — from the
 * React editor screen when the `editorReact` Labs flag is on, and from Ember
 * otherwise. The gating semantics (loading, error, and flag branching) live
 * in FlagGatedRoute.
 */
const EditorReact = lazy(lazyEditorScreen);

export function EditorGate() {
  return <FlagGatedRoute component={EditorReact} flag="editorReact" />;
}

export default EditorGate;
