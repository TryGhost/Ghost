interface EditorReturnLocationState {
  editorReturn?: unknown;
}

/** Where the editor's header leads back to, and what opened the editor there. */
export interface EditorReturn {
  to: string;
  kind: 'analytics' | 'app';
}

const ANALYTICS_RETURN = /^\/(?:posts\/analytics\/|analytics(?:[/?]|$))/;
// An installation's ID is an ObjectId. Admin's own screens under /apps/ have word names, so they
// never match.
const APP_RETURN = /^\/apps\/[0-9a-f]{24}(?:[/?#]|$)/;
const DOT_SEGMENT = /\/\.\.?(?:\/|$)/;

/**
 * Router state for opening the editor from an analytics screen or an app, so its header leads back
 * there. An app's route is passed whole, as Admin routes it.
 */
export function editorReturnState(from: string | { pathname: string; search: string }) {
  return {
    editorReturn: typeof from === 'string' ? from : `${from.pathname}${from.search}`,
  } satisfies EditorReturnLocationState;
}

/** The analytics screen or app the editor was opened from, if the location state carries one. */
export function readEditorReturn(state: unknown): EditorReturn | undefined {
  const editorReturn = (state as EditorReturnLocationState | null)?.editorReturn;
  if (typeof editorReturn !== 'string' || DOT_SEGMENT.test(editorReturn.split(/[?#]/)[0])) {
    return undefined;
  }
  if (ANALYTICS_RETURN.test(editorReturn)) {
    return { to: editorReturn, kind: 'analytics' };
  }
  if (APP_RETURN.test(editorReturn)) {
    return { to: editorReturn, kind: 'app' };
  }
  return undefined;
}
