import { useMemo } from 'react';
import type {
  EditorSessionBinding,
  EditorSessionHandle,
} from '@/editor/session/use-editor-session';

/** What the settings panel may reach on the editing session, and nothing else. */
export type EditorSettingsPort = Pick<
  EditorSessionHandle,
  | 'commitSettings'
  | 'createdId'
  | 'dispose'
  | 'editPublishedAt'
  | 'editSettings'
  | 'editSlug'
  | 'loadedRecord'
  | 'publishTime'
  | 'restoreRevision'
  | 'settings'
  | 'slug'
  | 'stageSettings'
> & {
  bind: Pick<EditorSessionBinding, 'title' | 'excerpt' | 'onExcerptChange'>;
};

/** The port's identity tracks the members it carries, not the render that produced it. */
export function useEditorSettingsPort(session: EditorSessionHandle): EditorSettingsPort {
  const { title, excerpt, onExcerptChange } = session.bind;
  const {
    commitSettings,
    createdId,
    dispose,
    editPublishedAt,
    editSettings,
    editSlug,
    loadedRecord,
    publishTime,
    restoreRevision,
    settings,
    slug,
    stageSettings,
  } = session;

  const bind = useMemo(
    () => ({ title, excerpt, onExcerptChange }),
    [title, excerpt, onExcerptChange],
  );

  return useMemo(
    () => ({
      bind,
      commitSettings,
      createdId,
      dispose,
      editPublishedAt,
      editSettings,
      editSlug,
      loadedRecord,
      publishTime,
      restoreRevision,
      settings,
      slug,
      stageSettings,
    }),
    [
      bind,
      commitSettings,
      createdId,
      dispose,
      editPublishedAt,
      editSettings,
      editSlug,
      loadedRecord,
      publishTime,
      restoreRevision,
      settings,
      slug,
      stageSettings,
    ],
  );
}
