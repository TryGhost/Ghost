import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  GhMediaUpload,
  GhEditorInput,
  GhEditorSelect,
  GhEditorToggle,
  type AddonEditorSettingsBridge,
} from '@tryghost/addon-kit/editor-settings';
import { MEDIA_SLOTS, parseConfiguration, type Show } from './model.ts';

function Settings({ ghost }: { ghost: AddonEditorSettingsBridge }) {
  const [props, setProps] = useState(ghost.props);
  const [error, setError] = useState('');
  const revision = useRef(0);
  useEffect(() => ghost.onPropsChange(setProps), [ghost]);
  let shows: Show[];
  try {
    shows = parseConfiguration(ghost.context?.configuration).shows;
  } catch {
    shows = [];
  }
  const text = (key: string) => (typeof props[key] === 'string' ? props[key] : '');
  const number = (key: string) => (typeof props[key] === 'number' ? String(props[key]) : '');
  const propose = async (patch: Record<string, unknown>) => {
    setError('');
    revision.current += 1;
    const request = revision.current;
    setProps((current) => ({ ...current, ...patch }));
    try {
      await ghost.proposePatch({ ...patch, version: 1 });
    } catch {
      if (revision.current === request) {
        setError('Could not update the episode. Please try again.');
      }
    } finally {
      if (revision.current === request) {
        setProps(ghost.props);
      }
    }
  };
  const numberChanged = (key: string, value: string) => {
    const parsed = value.trim() ? Number(value) : null;
    if (parsed !== null && (!Number.isSafeInteger(parsed) || parsed < 0)) {
      setError('Use a whole number of zero or greater.');
      return;
    }
    void propose({ [key]: parsed });
  };
  const missingShow = text('show_id') && !shows.some((show) => show.id === props.show_id);
  return (
    <>
      <GhEditorSelect
        description={
          error ||
          (!shows.length
            ? 'Add a show in Podcasts settings, then reopen this post.'
            : 'Each card is a separate episode.')
        }
        label="Show"
        options={[
          { value: '', label: 'Choose a show' },
          ...(missingShow ? [{ value: text('show_id'), label: 'Unavailable show' }] : []),
          ...shows.map((show) => ({ value: show.id, label: show.title })),
        ]}
        value={text('show_id')}
        onChange={(event) => void propose({ show_id: event.detail || null })}
      />
      <GhEditorInput
        description="Leave empty to use the current post title."
        label="Episode title"
        placeholder="Use post title"
        value={text('title')}
        onChange={(event) => void propose({ title: event.detail || null })}
      />
      <GhEditorInput
        label="Episode number"
        value={number('episode_number')}
        onChange={(event) => numberChanged('episode_number', event.detail)}
      />
      <GhEditorInput
        label="Season number"
        value={number('season_number')}
        onChange={(event) => numberChanged('season_number', event.detail)}
      />
      {MEDIA_SLOTS.map((slot) => {
        const media = props[slot];
        const url =
          media && typeof media === 'object' && 'url' in media && typeof media.url === 'string'
            ? media.url
            : undefined;
        return (
          <GhMediaUpload
            key={slot}
            format={slot.endsWith('audio') ? 'audio' : 'video'}
            label={
              {
                full_audio: 'Full audio',
                free_audio: 'Free audio',
                full_video: 'Full video',
                free_video: 'Free video',
              }[slot]
            }
            url={url}
            onChange={(event) => void propose({ [slot]: event.detail })}
          />
        );
      })}
      <GhEditorToggle
        checked={props.offer_free === true}
        description="Separate preview files can be offered where this card is publicly visible."
        label="Offer free versions"
        onChange={(event) => void propose({ offer_free: event.detail })}
      />
    </>
  );
}

export default function editorSettings(ghost: AddonEditorSettingsBridge) {
  if (ghost.blockName !== 'episode') {
    throw new Error('Unknown podcast block');
  }
  render(<Settings ghost={ghost} />, document.body);
}
