import { render } from 'preact';
import { useState } from 'preact/hooks';
import {
  GhButton,
  GhHeading,
  GhInline,
  GhSeparator,
  GhStack,
  GhText,
  type GhostBridge,
} from '@tryghost/addon-kit/addon';
import { GhEditorInput, GhEditorSelect, GhEditorToggle } from '@tryghost/addon-kit/editor-settings';
import { parseConfiguration, type Show } from './model.ts';

function Page({ ghost }: { ghost: GhostBridge }) {
  const [initial] = useState(() => {
    try {
      return { shows: parseConfiguration(ghost.data.context.configuration).shows, error: '' };
    } catch (error) {
      return { shows: [], error: String(error) };
    }
  });
  const [shows, setShows] = useState<Show[]>(initial.shows);
  const [selected, setSelected] = useState(initial.shows[0]?.id ?? '');
  const [error, setError] = useState(initial.error);
  const [saving, setSaving] = useState(false);
  const show = shows.find((item) => item.id === selected);
  const patch = (update: Partial<Show>) =>
    setShows((current) =>
      current.map((item) => (item.id === selected ? { ...item, ...update } : item)),
    );
  const addShow = () => {
    const next: Show = {
      id: crypto.randomUUID(),
      title: 'New show',
      description: '',
      artwork: '',
      author: '',
      language: 'en',
      explicit: false,
    };
    setShows((current) => [...current, next]);
    setSelected(next.id);
  };
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const configuration = parseConfiguration({ shows });
      if (!ghost.configuration) {
        throw new Error('This host cannot save app configuration.');
      }
      await ghost.configuration.save({ ...configuration });
      await ghost.toast.show('Shows saved.', { type: 'success' });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <GhStack gap="lg" maxWidth="form">
      <GhInline justify="between">
        <GhHeading>Show settings</GhHeading>
        <GhButton variant="secondary" onPress={addShow}>
          Add show
        </GhButton>
      </GhInline>
      <GhText tone="muted">
        Give your shows a home. Each one has its own audio and video feeds.
      </GhText>
      <GhEditorSelect
        label="Show to edit"
        options={[
          { value: '', label: 'Choose a show' },
          ...shows.map((item) => ({ value: item.id, label: item.title })),
        ]}
        value={selected}
        onChange={(event) => setSelected(event.detail)}
      />
      {show ? (
        <GhStack gap="lg">
          <GhSeparator />
          <GhHeading level={4}>Show details</GhHeading>
          <GhEditorInput
            key={`${show.id}:title`}
            label="Show title"
            placeholder="Your podcast’s name"
            value={show.title}
            onChange={(event) => patch({ title: event.detail })}
          />
          <GhEditorInput
            key={`${show.id}:description`}
            description="Introduce your show to listeners in their podcast app."
            label="Description"
            placeholder="What is your show about?"
            value={show.description}
            multiline
            onChange={(event) => patch({ description: event.detail })}
          />
          <GhEditorInput
            key={`${show.id}:artwork`}
            description="A square image URL for your podcast’s cover."
            label="Cover artwork"
            placeholder="https://…"
            value={show.artwork}
            onChange={(event) => patch({ artwork: event.detail })}
          />
          <GhSeparator />
          <GhHeading level={4}>Feed settings</GhHeading>
          <GhEditorInput
            key={`${show.id}:author`}
            label="Author"
            placeholder="Creator or publication name"
            value={show.author}
            onChange={(event) => patch({ author: event.detail })}
          />
          <GhEditorInput
            key={`${show.id}:language`}
            description="Language code, such as en for English or fr for French."
            label="Language"
            value={show.language}
            onChange={(event) => patch({ language: event.detail })}
          />
          <GhEditorToggle
            checked={show.explicit}
            description="Label this show as explicit in podcast apps."
            label="Explicit content"
            onChange={(event) => patch({ explicit: event.detail })}
          />
        </GhStack>
      ) : (
        <GhText tone="muted">Add your first show to start publishing podcast episodes.</GhText>
      )}
      <GhSeparator />
      {error ? <GhText>{error}</GhText> : null}
      <GhInline justify="between">
        <GhText tone="muted">Episode access is managed in the editor.</GhText>
        <GhButton disabled={saving || !!initial.error} onPress={() => void save()}>
          {saving ? 'Saving…' : 'Save shows'}
        </GhButton>
      </GhInline>
    </GhStack>
  );
}

export default function page(ghost: GhostBridge) {
  render(<Page ghost={ghost} />, document.body);
}
