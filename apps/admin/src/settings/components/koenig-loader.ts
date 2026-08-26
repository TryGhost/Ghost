import type React from 'react';
import { type FetchKoenigLexical } from '@tryghost/shade/app';

export type { FetchKoenigLexical };

declare global {
  interface Window {
    '@tryghost/koenig-lexical'?: { version?: string };
  }
}

type KoenigComponent = React.ComponentType<Record<string, unknown>>;

// Minimal surface of the untyped @tryghost/koenig-lexical bundle used by the settings editors
export type KoenigLexicalModule = {
  KoenigComposer: KoenigComponent;
  KoenigComposableEditor: KoenigComponent;
  EmojiPickerPlugin: KoenigComponent;
  HtmlOutputPlugin: KoenigComponent;
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
  insertParagraphAtBottom: () => void;
  lastNodeIsDecorator: () => boolean;
};

export const loadKoenig = function (fetchKoenigLexical: FetchKoenigLexical) {
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
        throw error instanceof Error ? error : new Error(String(error));
      default:
        return response!;
    }
  };

  return { read };
};

export type EditorResource = ReturnType<typeof loadKoenig>;
