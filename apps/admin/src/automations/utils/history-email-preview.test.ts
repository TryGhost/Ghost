import { describe, expect, it } from 'vitest';
import { historyEmailPreview } from './history-email-preview';
import { mapRunHistory } from './run-history';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';

const doc = (...children: unknown[]) => JSON.stringify({ root: { type: 'root', children } });
const paragraph = (text: string) => ({
  type: 'paragraph',
  children: [{ type: 'extended-text', text }],
});

describe('historical email text preview', () => {
  it('keeps paragraphs, inline links and literal text from the historical document', () => {
    const lexical = doc(paragraph('Hey there,'), {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Read ' },
        {
          type: 'link',
          url: 'https://example.com',
          children: [{ type: 'extended-text', text: 'the archive' }],
        },
        { type: 'text', text: ' <when you like>.' },
      ],
    });
    expect(historyEmailPreview('Historical subject', lexical)).toEqual({
      subject: 'Historical subject',
      content: { state: 'available', text: 'Hey there,\n\nRead the archive <when you like>.' },
    });
  });

  it('extracts card text and strips HTML, script and style markup', () => {
    const lexical = doc(
      { type: 'callout', calloutText: '<p>Read <strong>this</strong> &amp; that</p>' },
      {
        type: 'html',
        html: '<p>One</p><script>window.bad = true</script><style>.bad{}</style><p>Two</p>',
      },
    );
    expect(historyEmailPreview('Subject', lexical).content).toEqual({
      state: 'available',
      text: 'Read this & that\n\nOne\nTwo',
    });
  });

  it('shows headings, quotes, buttons and Markdown as readable text', () => {
    expect(
      historyEmailPreview(
        'Subject',
        doc(
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Welcome' }] },
          { type: 'quote', children: [{ type: 'text', text: 'A quotation' }] },
          { type: 'button', buttonText: 'Read more', buttonUrl: 'https://example.com' },
          { type: 'markdown', markdown: '## News\n\n**Hello** [reader](https://example.com)' },
        ),
      ).content,
    ).toEqual({
      state: 'available',
      text: 'Welcome\n\nA quotation\n\nRead more\n\nNews\nHello reader',
    });
  });

  it.each(['', '  ', doc(), doc({ type: 'paragraph', children: [] }), doc(paragraph(' \n '))])(
    'distinguishes an empty document %s from missing content',
    (lexical) => {
      expect(historyEmailPreview('', lexical)).toEqual({
        subject: '',
        content: { state: 'empty' },
      });
    },
  );

  it.each([
    null,
    '{bad',
    'null',
    '[]',
    '{}',
    doc(null),
    doc({ type: 'text', text: 123 }),
    JSON.stringify({ root: { children: 'bad' } }),
  ])('handles missing or malformed content %s explicitly', (lexical) => {
    expect(historyEmailPreview(null, lexical)).toEqual({
      subject: null,
      content: { state: 'unavailable' },
    });
  });

  it.each([
    { type: 'image', src: 'https://example.com/image.jpg' },
    { type: 'future-card', value: 'A new kind of content' },
  ])('does not describe non-text content as empty', (node) => {
    expect(historyEmailPreview('Subject', doc(node)).content).toEqual({ state: 'no_text' });
  });

  it('maps each email revision independently and keeps its recorded step state', () => {
    const timestamp = '2026-09-14T12:00:00.000Z';
    const finished = '2026-09-14T12:00:01.000Z';
    const nextReady = '2026-09-17T12:00:00.000Z';
    const first: AutomationRunHistory['steps'][number] = {
      id: 'first',
      automation_action_revision_id: 'old',
      created_at: timestamp,
      updated_at: timestamp,
      ready_at: timestamp,
      started_at: timestamp,
      finished_at: finished,
      status: 'finished',
      action: {
        id: 'same-action',
        type: 'send_email',
        data: { email_subject: 'Old subject', email_lexical: doc(paragraph('Old body')) },
      },
    };
    const history: AutomationRunHistory = {
      id: 'run',
      automation_id: 'automation',
      created_at: timestamp,
      member: null,
      status: 'in_progress',
      failed: false,
      history_status: 'available',
      steps: [
        first,
        {
          ...first,
          id: 'second',
          automation_action_revision_id: 'newer',
          status: 'pending',
          finished_at: null,
          ready_at: nextReady,
          action: {
            id: 'same-action',
            type: 'send_email',
            data: { email_subject: 'Newer subject', email_lexical: doc(paragraph('Newer body')) },
          },
        },
      ],
    };
    const cards = mapRunHistory(history);
    expect(cards[1]).toMatchObject({
      title: 'Sent email',
      timestamp: { label: 'Sent', value: finished },
      email: { subject: 'Old subject', content: { text: 'Old body' } },
    });
    expect(cards[2]).toMatchObject({
      title: 'Send email',
      state: 'pending',
      timestamp: { label: 'Scheduled', value: nextReady },
      email: { subject: 'Newer subject', content: { text: 'Newer body' } },
    });
    expect(cards[2].statusLabel).toBe('Pending');
  });
});
