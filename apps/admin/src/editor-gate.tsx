import { Navigate } from '@tryghost/admin-x-framework';
import { FlagGatedRoute } from './flag-gated-route';
import { lazy } from 'react';
import { EditorSkeleton, lazyEditorScreen } from './editor/api';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useForceUpgrade } from './billing/api';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';

/**
 * Serves `/editor/*` — new (`:type`) and edit (`:type/:postId`) — from the
 * React editor screen when the `editorReact` Labs flag is on, and from Ember
 * otherwise. The gating semantics (loading, error, and flag branching) live
 * in FlagGatedRoute.
 */
const EditorReact = lazy(lazyEditorScreen);

export function EditorGate() {
  const editorOwner = useFlagGatedRouteOwner('editorReact');
  const billingOwner = useFlagGatedRouteOwner('billingReact');
  const forceUpgrade = useForceUpgrade();
  const screenTransitions = useFeatureFlag('admin7ScreenTransitions');

  // The route skips the shell's force-upgrade guard because Ember enforces it on
  // its own editor — but only while Ember also owns billing.
  if ((editorOwner === 'react' || billingOwner === 'react') && forceUpgrade !== false) {
    if (forceUpgrade) {
      return <Navigate to="/pro" replace />;
    }
    return screenTransitions && editorOwner === 'react' ? <EditorSkeleton /> : null;
  }

  return (
    <FlagGatedRoute
      component={EditorReact}
      fallback={screenTransitions ? <EditorSkeleton /> : null}
      flag="editorReact"
    />
  );
}

export default EditorGate;
