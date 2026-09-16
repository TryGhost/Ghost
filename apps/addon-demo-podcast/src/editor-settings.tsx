import { GhEditorInput, type AddonEditorSettingsBridge } from '@tryghost/addon-kit/editor-settings';
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const RESOLVE_URL = 'http://localhost:4652/api/resolve';
const RESOLVED_FIELDS = [
  'title',
  'showName',
  'description',
  'artworkUrl',
  'audioUrl',
  'canonicalUrl',
  'duration',
];

function Settings({ ghost }: { ghost: AddonEditorSettingsBridge }) {
  const [props, setProps] = useState(() => ghost.props);
  const [status, setStatus] = useState('Paste a public HTTPS episode URL.');
  const revision = useRef(0);

  useEffect(() => ghost.onPropsChange(setProps), [ghost]);

  const propose = async (patch: Record<string, unknown>) => {
    setProps((current) => ({ ...current, ...patch }));
    await ghost.proposePatch(patch);
  };

  const resolveUrl = async (submittedUrl: string) => {
    revision.current += 1;
    const currentRevision = revision.current;
    const cleared = Object.fromEntries(RESOLVED_FIELDS.map((field) => [field, '']));
    await propose({ submittedUrl, ...cleared });

    try {
      if (new URL(submittedUrl).protocol !== 'https:') {
        setStatus('Use a public HTTPS episode URL.');
        return;
      }
    } catch {
      setStatus('Paste a complete episode URL.');
      return;
    }

    setStatus('Resolving episode…');
    try {
      const response = await ghost.fetch(RESOLVE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: submittedUrl }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Episode resolution failed');
      }
      if (currentRevision !== revision.current) {
        return;
      }
      await propose(body.episode);
      setStatus('Episode resolved. Re-enter the URL to refresh it.');
    } catch (error) {
      if (currentRevision === revision.current) {
        setStatus(error instanceof Error ? error.message : 'Episode resolution failed');
      }
    }
  };

  return (
    <GhEditorInput
      description={status}
      label="Episode URL"
      placeholder="https://example.com/podcast/episode"
      value={typeof props.submittedUrl === 'string' ? props.submittedUrl : ''}
      onChange={(event) => void resolveUrl(event.detail)}
    />
  );
}

export default function renderEditorSettings(ghost: AddonEditorSettingsBridge) {
  if (ghost.blockName !== 'podcast-player') {
    throw new Error(`Unknown editor block: ${ghost.blockName}`);
  }
  render(<Settings ghost={ghost} />, document.body);
}
