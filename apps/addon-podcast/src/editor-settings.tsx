import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  GhMediaUpload,
  GhEditorInput,
  GhEditorRow,
  GhEditorSelect,
  GhEditorToggle,
  type AddonEditorSettingsBridge,
} from '@tryghost/addon-kit/editor-settings';
import { parseConfiguration, type Show } from './model.ts';

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
  const mediaField = (slot: 'full_audio' | 'full_video' | 'free_audio' | 'free_video') => {
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
            full_audio: 'Audio',
            full_video: 'Video',
            free_audio: 'Free audio',
            free_video: 'Free video',
          }[slot]
        }
        url={url}
        onChange={(event) => void propose({ [slot]: event.detail })}
      />
    );
  };
  return (
    <>
      <GhEditorSelect
        description={
          error ||
          (!shows.length ? 'Add a show in Podcasts settings, then reopen this post.' : undefined)
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
        label="Episode title"
        placeholder="Use post title"
        value={text('title')}
        onChange={(event) => void propose({ title: event.detail || null })}
      />
      <GhEditorRow>
        <GhEditorInput
          label="Episode"
          value={number('episode_number')}
          onChange={(event) => numberChanged('episode_number', event.detail)}
        />
        <GhEditorInput
          label="Season"
          value={number('season_number')}
          onChange={(event) => numberChanged('season_number', event.detail)}
        />
      </GhEditorRow>
      {mediaField('full_audio')}
      {mediaField('full_video')}
      <GhEditorToggle
        checked={props.offer_free === true}
        description="Offer separate preview files."
        label="Free preview"
        onChange={(event) => void propose({ offer_free: event.detail })}
      />
      {props.offer_free === true && mediaField('free_audio')}
      {props.offer_free === true && mediaField('free_video')}
    </>
  );
}

export default function editorSettings(ghost: AddonEditorSettingsBridge) {
  if (ghost.blockName !== 'episode') {
    throw new Error('Unknown podcast block');
  }
  render(<Settings ghost={ghost} />, document.body);
}
