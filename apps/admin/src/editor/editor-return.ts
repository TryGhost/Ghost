interface EditorReturnLocationState {
  editorReturn?: unknown;
}

const ANALYTICS_RETURN = /^\/(?:posts\/analytics\/|analytics(?:[/?]|$))/;
const DOT_SEGMENT = /\/\.\.?(?:\/|$)/;

/** Router state for opening the editor from an analytics screen, so its header leads back there. */
export function editorReturnState({ pathname, search }: { pathname: string; search: string }) {
  return { editorReturn: `${pathname}${search}` } satisfies EditorReturnLocationState;
}

/** The analytics path the editor was opened from, if the location state carries one. */
export function readEditorReturn(state: unknown): string | undefined {
  const editorReturn = (state as EditorReturnLocationState | null)?.editorReturn;
  return typeof editorReturn === 'string' &&
    ANALYTICS_RETURN.test(editorReturn) &&
    !DOT_SEGMENT.test(editorReturn.split('?')[0])
    ? editorReturn
    : undefined;
}
