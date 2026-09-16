import { useEffect, useRef, useState } from 'react';

import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';

import { IframePreviewDocumentSurface } from './preview-document';
import { ThemePreviewAdapter } from './theme-preview-adapter';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';

import type {
  ThemeRendererClient,
  ThemeRendererInitialization,
  ThemeRenderResult,
} from './preview-bridge';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';

async function proofDraft(content: string): Promise<ThemeDraft> {
  return withThemeRevision({
    revision: '',
    theme: {
      name: 'preview-proof',
      version: '1.0.0',
      builtIn: false,
      rootPrefix: 'preview-proof/',
    },
    files: {
      'package.json': {
        path: 'package.json',
        kind: 'text',
        content: '{"name":"preview-proof"}',
        binary: null,
        unixPermissions: null,
        dosPermissions: 0,
      },
      'index.hbs': {
        path: 'index.hbs',
        kind: 'text',
        content,
        binary: null,
        unixPermissions: null,
        dosPermissions: 0,
      },
    },
    globalSettings: {
      accent_color: null,
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

class ProofRenderer implements ThemeRendererClient {
  private theme: Record<string, string> = {};

  initialize(input: ThemeRendererInitialization, signal: AbortSignal): Promise<void> {
    return this.setTheme(input.theme, input.revision, signal);
  }

  setTheme(theme: Record<string, string>, _revision: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }
    if (theme['index.hbs']?.includes('{{broken')) {
      return Promise.reject(new Error('Proof render error'));
    }
    this.theme = structuredClone(theme);
    return Promise.resolve();
  }

  render(url: string, _revision: string, signal: AbortSignal): Promise<ThemeRenderResult> {
    if (signal.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }
    const page = new URL(url).pathname === '/about/' ? 'About' : 'Home';
    const content = this.theme['index.hbs'] ?? '';
    if (content.includes('late-bypass-preview')) {
      return Promise.resolve({
        status: 200,
        url,
        diagnostics: [],
        html: '<!doctype html><html><body><script>document.addEventListener("DOMContentLoaded", () => { location.href = "about:blank"; })</script><h1>Late escaped preview</h1></body></html>',
      });
    }
    if (content.includes('bypass-preview')) {
      return Promise.resolve({
        status: 200,
        url,
        diagnostics: [],
        html: '<!doctype html><html><body><script>location.href = "about:blank"</script><h1>Escaped preview</h1></body></html>',
      });
    }
    return Promise.resolve({
      status: 200,
      url,
      diagnostics: [],
      html: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src 'none'"><meta http-equiv="refresh" content="0;url=https://outside.example/"></head><body><nav><a href="/about/">About</a></nav><main data-edit="index.hbs:1:1"><h1>${page}</h1><p>${content}</p></main></body></html>`,
    });
  }

  destroy(): void {}
}

const PreviewRuntimeProof = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adapterRef = useRef<ThemePreviewAdapter | null>(null);
  const [result, setResult] = useState('Loading preview proof');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    const surface = new IframePreviewDocumentSurface(iframe, { openWindow: () => {} });
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(new ProofRenderer()),
      surface,
    });
    adapterRef.current = adapter;
    let active = true;
    void proofDraft('<p>Initial</p>')
      .then((initial) => adapter.start(initial, new AbortController().signal))
      .then(() => {
        if (active) {
          setResult(`ready:${adapter.state.url}`);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult(error instanceof Error ? error.message : 'Preview proof failed');
        }
      });
    return () => {
      active = false;
      adapterRef.current = null;
      adapter.destroy();
    };
  }, []);

  const navigate = async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    const navigation = await adapter.navigate('/about/', new AbortController().signal);
    setResult(`${navigation.kind}:${navigation.url}`);
  };

  const breakPreview = async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    const broken = await proofDraft('<main>{{broken</main>');
    const validation = await adapter.renderCandidate(broken, new AbortController().signal);
    setResult(`${validation.valid ? 'unexpected-valid' : 'invalid'}:${adapter.state.url}`);
  };

  const repairPreview = async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    const repaired = await proofDraft('<p>Repaired</p>');
    const validation = await adapter.renderCandidate(repaired, new AbortController().signal);
    setResult(`${validation.valid ? 'repaired' : 'repair-failed'}:${adapter.state.url}`);
  };

  const bypassBridge = async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    const bypassing = await proofDraft('<p>bypass-preview</p>');
    const validation = await adapter.renderCandidate(bypassing, new AbortController().signal);
    setResult(`${validation.valid ? 'bypass-unexpected' : 'bypass-blocked'}:${adapter.state.url}`);
  };

  const bypassAfterReady = async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      return;
    }
    const bypassing = await proofDraft('<p>late-bypass-preview</p>');
    const validation = await adapter.renderCandidate(bypassing, new AbortController().signal);
    setResult(
      `${validation.valid ? 'late-bypass-unexpected' : 'late-bypass-blocked'}:${adapter.state.url}`,
    );
  };

  return (
    <Box className="size-full bg-background" padding="lg">
      <Stack gap="md">
        <Text as="h1" size="xl" weight="semibold">
          Theme preview browser proof
        </Text>
        <Inline gap="sm">
          <Button type="button" onClick={() => void navigate()}>
            Navigate preview
          </Button>
          <Button type="button" variant="outline" onClick={() => void breakPreview()}>
            Break candidate
          </Button>
          <Button type="button" variant="outline" onClick={() => void repairPreview()}>
            Repair candidate
          </Button>
          <Button type="button" variant="outline" onClick={() => void bypassBridge()}>
            Bypass bridge
          </Button>
          <Button type="button" variant="outline" onClick={() => void bypassAfterReady()}>
            Bypass after ready
          </Button>
        </Inline>
        <Text data-testid="preview-proof-result">{result}</Text>
        <iframe
          ref={iframeRef}
          className="h-96 w-full rounded-md border border-border"
          data-testid="preview-proof-frame"
          title="Theme preview proof"
        />
      </Stack>
    </Box>
  );
};

export default PreviewRuntimeProof;
