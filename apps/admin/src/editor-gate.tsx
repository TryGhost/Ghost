import { Navigate } from '@tryghost/admin-x-framework';
import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { lazyEditorScreen } from './editor/api';
import { useForceUpgrade } from './ember-bridge';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';

/**
 * Serves `/editor/*` — new (`:type`) and edit (`:type/:postId`) — from the
 * React editor screen when the `editorReact` Labs flag is on, and from Ember
 * otherwise. The gating semantics (loading, error, and flag branching) live
 * in FlagGatedRoute.
 */
const EditorReact = lazy(lazyEditorScreen);

export function EditorGate() {
  const owner = useFlagGatedRouteOwner('editorReact');
  const forceUpgrade = useForceUpgrade();

  // The route skips the shell's force-upgrade guard because Ember enforces it on its own editor.
  if (owner === 'react' && forceUpgrade !== false) {
    return forceUpgrade ? <Navigate to="/pro" replace /> : null;
  }

  return <FlagGatedRoute component={EditorReact} flag="editorReact" />;
}

export default EditorGate;
