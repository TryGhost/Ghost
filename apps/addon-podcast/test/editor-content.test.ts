import { expect, it } from 'vitest';
import render from '../src/editor-content.tsx';

it('renders nullable episode props without requiring configuration', async () => {
  const output = await render({
    blockName: 'episode',
    props: { version: 1, title: null, show_id: null, episode_number: null },
  });
  expect(output.html).toContain('data-ghost-post-title');
  expect(output.html).toContain('Untitled post');
  expect(output.html).toContain('Choose a show');
});

it('renders only safe metadata and escapes episode titles', async () => {
  const output = await render({
    blockName: 'episode',
    props: {
      version: 1,
      title: '<script>bad</script>',
      full_audio: { url: 'https://private.example/full.mp3' },
    },
  });
  expect(output.html).toContain('&lt;script');
  expect(output.html).not.toContain('data-ghost-post-title');
  expect(output.html).not.toContain('<script>');
  expect(output.publicProps).toEqual({});
  expect(JSON.stringify(output)).not.toContain('private.example');
  expect(output.html).not.toContain('private.example');
  expect(output.portableHtml).not.toContain('private.example');
  expect(output.portableHtml).toContain('data-ghost-post-link');
  expect(output.portableHtml).toContain('Listen to this episode on the website');
});
