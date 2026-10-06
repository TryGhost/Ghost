import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLexical, buildLexicalParagraph } from '@tryghost/test-data';
import type { PostCardConfig } from './card-config';
import { createChangeTracker, type ChangeReasonCode } from './engine/change-tracker';
import { OLD_SCHEMA_CORPUS } from './engine/__fixtures__';
import type { LexicalInput } from './engine/lexical-compare';
import { KoenigPostEditor } from './koenig-post-editor';
import { newPostProjection, projectionOf } from './session/projection';
import { record } from './session/__test-utils__/session-harness';

vi.mock('@/settings/components/koenig-loader', async () => {
  const koenig = (await import('@tryghost/koenig-lexical')) as Record<string, unknown>;
  return { loadKoenig: () => ({ read: () => koenig }), loadedKoenigVersion: () => 'test' };
});

vi.mock('./koenig-file-uploader', async () => {
  const { koenigFileUploadTypes } = await import('@tryghost/admin-x-framework/hooks');
  return {
    editorFileUploader: {
      useFileUpload: () => ({
        progress: 0,
        isLoading: false,
        errors: [],
        filesNumber: 0,
        upload: () => Promise.resolve(null),
      }),
      fileTypes: koenigFileUploadTypes,
    },
  };
});

const POST_ID = 'abc123';
const NOOP = () => {};

function withCard(card: Record<string, unknown>): string {
  const document = JSON.parse(buildLexicalParagraph('Before the card')) as {
    root: { children: unknown[] };
  };
  document.root.children.push(card);
  return JSON.stringify(document);
}

// Cards that rewrite themselves as they mount, or carry nested editors that
// report separately from the document's first normalization.
const CARD_DOCUMENTS: Array<[string, string]> = [
  [
    'header card',
    withCard({
      type: 'header',
      version: 2,
      header: '<span>Header card</span>',
      subheader: '',
      accentColor: '#123456',
      layout: 'full',
    }),
  ],
  ['callout card', withCard({ type: 'callout', calloutText: '<p>Note</p>', calloutEmoji: '💡' })],
  ['toggle card', withCard({ type: 'toggle', heading: '<span>Q</span>', content: '<p>A</p>' })],
  [
    'image card',
    withCard({ type: 'image', src: 'https://example.com/a.jpg', width: 100, height: 100 }),
  ],
  ['transistor card', buildLexical('transistor')],
];

const DOCUMENTS: Array<[string, string | null]> = [
  ['new post', null],
  ...OLD_SCHEMA_CORPUS.map(({ name, before }): [string, string] => [name, JSON.stringify(before)]),
  ...CARD_DOCUMENTS,
];

const tick = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Waits until both instances have reported and neither reports again for a while. */
async function settled(reports: () => number): Promise<void> {
  let seen = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await act(() => tick(50));
    if (reports() === seen && seen >= 2) {
      return;
    }
    seen = reports();
  }
  throw new Error('Koenig kept reporting');
}

describe('KoenigPostEditor load', () => {
  afterEach(cleanup);

  it.each(DOCUMENTS)('%s never reads as changed while it loads', async (_name, lexical) => {
    const id = lexical === null ? null : POST_ID;
    const tracker = createChangeTracker();
    tracker.load(
      id,
      lexical === null ? newPostProjection() : projectionOf(record({ id: POST_ID, lexical })),
    );

    const reasons: ChangeReasonCode[] = [];
    let reports = 0;
    const observe = () => {
      reports += 1;
      reasons.push(...tracker.verdict().reasons.map(({ code }) => code));
    };

    render(
      <KoenigPostEditor
        cardConfig={{} as PostCardConfig}
        darkMode={false}
        initialLexical={lexical}
        placeholder="Begin writing your post..."
        registerAPI={NOOP}
        onChange={(next) => {
          tracker.setLive(id, { lexical: JSON.stringify(next) });
          observe();
        }}
        onSecondaryChange={(next) => {
          tracker.setBaseline(id, next as LexicalInput);
          observe();
        }}
        onSecondaryError={() => tracker.baselineFailed(id)}
        onTkCountChange={NOOP}
        onWordCountChange={NOOP}
      />,
    );

    await settled(() => reports);

    expect(reasons).toEqual([]);
    expect(tracker.verdict().dirty).toBe(false);
  });
});
