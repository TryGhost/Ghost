import { useEffect, useState } from 'react';

import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';

import { BuilderShell } from './builder-shell';
import { BuilderSession } from './core/builder-session';
import { IframePreviewDocumentSurface } from './workspaces/theme/preview/preview-document';
import { ThemePreviewAdapter } from './workspaces/theme/preview/theme-preview-adapter';
import { cloneThemeDraft, withThemeRevision } from './workspaces/theme/theme-state';
import { ThemeWorkspace } from './workspaces/theme/theme-workspace';

import type { BuilderSessionState } from './core/builder-session';
import type { BuilderModelTurnRequest, ModelAccessAdapter } from './core/model-access';
import type { BuilderToolDefinition, BuilderToolResult } from './core/tool-types';
import type { CuratedModel } from './models/curated-models';
import type {
  ThemeRendererCandidateSettings,
  ThemeRendererClient,
  ThemeRendererInitialization,
  ThemeRenderResult,
} from './workspaces/theme/preview/preview-bridge';
import type { ThemePreviewState } from './workspaces/theme/preview/theme-preview-adapter';
import type { ThemeDraft } from './workspaces/theme/theme-state';

const proofModel: CuratedModel = {
  id: 'rewind-proof',
  name: 'Rewind proof',
  api: 'openai-responses',
  provider: 'openai',
  baseUrl: 'https://example.com',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1,
  maxTokens: 1,
};

const loadingState: BuilderSessionState = {
  status: 'loading',
  messages: [],
  workspace: { revision: '', dirty: false, validation: null },
};

const loadingPreviewState: ThemePreviewState = {
  revision: '',
  url: '',
  status: null,
  diagnostics: [],
  selection: null,
};

const steps = [
  {
    oldText: 'Initial',
    newText: 'First',
    color: '#111111',
    url: 'https://example.com/first/',
    selection: 'First hero',
  },
  {
    oldText: 'First',
    newText: 'Second',
    color: '#222222',
    url: 'https://example.com/second/',
    selection: 'Second hero',
  },
  {
    oldText: 'Initial',
    newText: 'Branched',
    color: '#333333',
    url: 'https://example.com/branch/',
    selection: 'Branch hero',
  },
] as const;

async function initialDraft(): Promise<ThemeDraft> {
  return withThemeRevision({
    revision: '',
    theme: { name: 'proof', version: '1.0.0', builtIn: false, rootPrefix: 'proof/' },
    files: {
      'index.hbs': {
        path: 'index.hbs',
        kind: 'text',
        content: 'Initial',
        binary: null,
        unixPermissions: null,
        dosPermissions: null,
      },
    },
    globalSettings: {
      accent_color: '#000000',
      heading_font: null,
      body_font: null,
      icon: null,
      logo: null,
      cover_image: null,
    },
    customSettings: {},
    renderer: {
      siteUrl: 'https://example.com/',
      contentApiKey: 'proof-key',
      config: {},
      missing: [],
    },
    virtualUrl: 'https://example.com/',
    selection: null,
  });
}

class RewindProofRenderer implements ThemeRendererClient {
  private theme: Record<string, string> = {};
  private settings: ThemeRendererCandidateSettings = {};

  initialize(input: ThemeRendererInitialization, signal: AbortSignal): Promise<void> {
    return this.setTheme(input.theme, input.revision, signal, input);
  }

  setTheme(
    theme: Record<string, string>,
    _revision: string,
    signal: AbortSignal,
    settings: ThemeRendererCandidateSettings = {},
  ): Promise<void> {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    this.theme = structuredClone(theme);
    this.settings = structuredClone(settings);
    return Promise.resolve();
  }

  render(url: string, _revision: string, signal: AbortSignal): Promise<ThemeRenderResult> {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const content = this.theme['index.hbs'] ?? 'Missing';
    const accent =
      typeof this.settings.settingsPayload?.accent_color === 'string'
        ? this.settings.settingsPayload.accent_color
        : 'none';
    return Promise.resolve({
      status: 200,
      url,
      diagnostics: [],
      html: `<!doctype html><html><body><main data-edit="index.hbs:1:1" aria-label="${content} hero"><h1>${content}</h1><p data-testid="rendered-setting">${accent}</p><p data-testid="rendered-path">Rendered path: ${new URL(url).pathname}</p></main></body></html>`,
    });
  }

  destroy(): void {}
}

function findTool(request: BuilderModelTurnRequest, name: string): BuilderToolDefinition {
  const tool = request.tools.find((item) => item.name === name);
  if (!tool) {
    throw new Error(`The rewind proof is missing ${name}.`);
  }
  return tool;
}

async function executeTool(
  request: BuilderModelTurnRequest,
  name: string,
  input: Record<string, unknown>,
): Promise<BuilderToolResult<unknown>> {
  const callId = `${name}-${request.messages.length}`;
  request.onEvent({ type: 'tool-start', callId, name, input });
  const result = await findTool(request, name).execute(input, request.signal);
  request.onEvent({ type: 'tool-end', callId, name, result });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result;
}

class RewindProofModelAccess implements ModelAccessAdapter {
  private step = 0;
  private readonly preview: ThemePreviewAdapter;

  constructor(preview: ThemePreviewAdapter) {
    this.preview = preview;
  }

  async runTurn(request: BuilderModelTurnRequest): Promise<void> {
    const step = steps[this.step];
    if (!step) {
      throw new Error('The rewind proof has no further scripted turn.');
    }
    this.step += 1;
    const file = await executeTool(request, 'replace_in_file', {
      revision: request.workspace.revision,
      path: 'index.hbs',
      oldText: step.oldText,
      newText: step.newText,
    });
    const setting = await executeTool(request, 'update_design_settings', {
      revision: file.revision,
      values: { 'global.accent_color': step.color },
    });
    await executeTool(request, 'navigate', { url: step.url });
    const selected = await withThemeRevision({
      ...this.preview.draft,
      selection: {
        id: 'index.hbs:1:1',
        label: step.selection,
        data: {
          tagName: 'main',
          marker: 'index.hbs:1:1',
          source: { path: 'index.hbs', line: 1, column: 1 },
        },
      },
    });
    const selectionValidation = await this.preview.restoreDraft(selected, request.signal);
    if (!selectionValidation.valid || this.preview.state.selection?.label !== step.selection) {
      throw new Error(`The preview did not select ${step.selection}.`);
    }
    request.onEvent({
      type: 'assistant-text-delta',
      text: `Applied ${step.newText.toLowerCase()} state at ${setting.revision}.`,
    });
    request.onEvent({ type: 'run-end' });
  }
}

export default function RewindRuntimeProof() {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [session, setSession] = useState<BuilderSession | null>(null);
  const [previewAdapter, setPreviewAdapter] = useState<ThemePreviewAdapter | null>(null);
  const [previewState, setPreviewState] = useState<ThemePreviewState>(loadingPreviewState);
  const [renderedText, setRenderedText] = useState('Loading preview');
  const [state, setState] = useState<BuilderSessionState>(loadingState);
  const [phase, setPhase] = useState<'initial' | 'first' | 'second' | 'rewound' | 'continued'>(
    'initial',
  );

  useEffect(() => {
    if (!iframe) {
      return;
    }
    const surface = new IframePreviewDocumentSurface(iframe, { openWindow: () => {} });
    const preview = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(new RewindProofRenderer()),
      surface,
    });
    let nextSession: BuilderSession | null = null;
    let unsubscribe = () => {};
    const unsubscribePreview = preview.subscribe(setPreviewState);
    let active = true;
    void initialDraft().then(async (draft) => {
      if (!active) {
        return;
      }
      const nextWorkspace = new ThemeWorkspace({
        id: 'theme:rewind-proof',
        title: 'Rewind proof',
        load: async (signal) => {
          await preview.start(draft, signal);
          return cloneThemeDraft(draft);
        },
        preview,
      });
      nextSession = new BuilderSession({
        workspace: nextWorkspace,
        modelAccess: new RewindProofModelAccess(preview),
      });
      unsubscribe = nextSession.subscribe(setState);
      setPreviewAdapter(preview);
      setSession(nextSession);
      await nextSession.load();
      const inspection = await preview.inspectPage(new AbortController().signal);
      if (active) {
        setRenderedText(inspection.text);
      }
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribePreview();
      nextSession?.dispose();
      preview.destroy();
    };
  }, [iframe]);

  const refreshPreviewText = async () => {
    if (!previewAdapter) {
      return;
    }
    const inspection = await previewAdapter.inspectPage(new AbortController().signal);
    setRenderedText(inspection.text);
  };

  const start = (message: string, nextPhase: typeof phase) => {
    if (!session) {
      return;
    }
    void session.startTurn(message).then(async () => {
      await refreshPreviewText();
      setPhase(nextPhase);
    });
  };

  const preview = (
    <Stack className="size-full p-6" gap="md">
      <Text as="h2" size="lg" weight="semibold">
        Theme rewind proof
      </Text>
      <Button
        disabled={phase !== 'initial' || state.status !== 'ready'}
        type="button"
        onClick={() => start('First edit', 'first')}
      >
        Run first edit
      </Button>
      <Button
        disabled={phase !== 'first' || state.status !== 'ready'}
        type="button"
        onClick={() => start('Second edit', 'second')}
      >
        Run second edit
      </Button>
      <Button
        disabled={phase !== 'rewound' || state.status !== 'ready'}
        type="button"
        onClick={() => start('Continue on a new branch', 'continued')}
      >
        Continue after rewind
      </Button>
      <Text data-testid="rewind-proof-rendered">Rendered: {renderedText}</Text>
      <Text data-testid="rewind-proof-url">URL: {previewState.url || 'loading'}</Text>
      <Text data-testid="rewind-proof-selection">
        Selection: {previewState.selection?.label ?? 'none'}
      </Text>
      <iframe
        ref={setIframe}
        className="min-h-64 w-full flex-1 rounded-md border border-border"
        title="Rewind proof preview"
      />
    </Stack>
  );

  return (
    <BuilderShell
      backLabel="Back to Design settings"
      backTo="/settings/design"
      hasCredential={true}
      modelId={proofModel.id}
      models={[proofModel]}
      preview={preview}
      provider="openai"
      selection={previewState.selection}
      state={state}
      title="Rewind proof"
      onForgetApiKey={() => {}}
      onRemoveSelection={() => void previewAdapter?.clearSelection()}
      onRetry={() => void session?.retryLastTurn()}
      onRewind={(messageId) =>
        session?.rewind(messageId).then(async () => {
          await refreshPreviewText();
          setPhase('rewound');
        }) ?? Promise.reject(new Error('The rewind proof is not ready.'))
      }
      onSaveApiKey={() => {}}
      onSelectModel={() => {}}
      onStop={() => session?.stop()}
      onSubmit={(message) =>
        session?.startTurn(message) ?? Promise.reject(new Error('The rewind proof is not ready.'))
      }
    />
  );
}
