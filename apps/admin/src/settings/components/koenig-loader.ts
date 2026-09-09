import type React from 'react';
import { fetchKoenigLexical } from '@/utils/fetch-koenig-lexical';

declare global {
  interface Window {
    '@tryghost/koenig-lexical'?: { version?: string };
  }
}

type KoenigComponent = React.ComponentType<Record<string, unknown>>;

// Minimal surface of the untyped @tryghost/koenig-lexical bundle used by the admin editors
export type KoenigLexicalModule = {
  KoenigComposer: KoenigComponent;
  KoenigComposableEditor: KoenigComponent;
  KoenigEditor: KoenigComponent;
  EmojiPickerPlugin: KoenigComponent;
  HtmlOutputPlugin: KoenigComponent;
  WordCountPlugin: KoenigComponent;
  TKCountPlugin: KoenigComponent;
  EmailEditor: KoenigComponent;
  DEFAULT_NODES: unknown;
  BASIC_NODES: unknown;
  MINIMAL_NODES: unknown;
  EMAIL_NODES: unknown;
  EMAIL_EDITOR_NODES: unknown;
  DEFAULT_TRANSFORMERS: unknown;
  BASIC_TRANSFORMERS: unknown;
  MINIMAL_TRANSFORMERS: unknown;
  EMAIL_TRANSFORMERS: unknown;
};

export type KoenigInstance = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  editorInstance: {
    getRootElement: () => HTMLElement | null;
  };
  focusEditor: (options?: { position?: 'top' | 'bottom' }) => void;
  editorIsEmpty: () => boolean;
  insertParagraphAtTop: (options?: { focus?: boolean }) => void;
  insertParagraphAtBottom: () => void;
  insertFiles: (files: File[]) => void;
  lastNodeIsDecorator: () => boolean;
};

export type EditorResource = {
  read: () => KoenigLexicalModule;
};

// One module-level load shared by every mount. Reading a failed load evicts it, so the
// next mount retries instead of replaying a stale error; the erroring render still throws.
let cached: EditorResource | undefined;

const createKoenigResource = (): EditorResource => {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let response: KoenigLexicalModule | undefined;
  let error: unknown;

  const suspender = fetchKoenigLexical().then(
    (res) => {
      status = 'success';
      response = res as KoenigLexicalModule;
    },
    (err: unknown) => {
      status = 'error';
      error = err;
    },
  );

  const read = (): KoenigLexicalModule => {
    switch (status) {
      case 'pending':
        // React Suspense protocol: throwing the pending promise suspends the tree
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw suspender;
      case 'error':
        if (cached === resource) {
          cached = undefined;
        }
        throw error instanceof Error ? error : new Error(String(error));
      default:
        return response!;
    }
  };

  const resource: EditorResource = { read };
  return resource;
};

export const loadKoenig = function (): EditorResource {
  cached ??= createKoenigResource();
  return cached;
};
