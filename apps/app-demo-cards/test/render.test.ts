import { describe, expect, it } from 'vitest';

import { renderBigNumber } from '../src/big-number/render.tsx';
import { renderChart } from '../src/chart/render.tsx';
import { renderEvent } from '../src/event/render.tsx';
import { renderPodcast } from '../src/podcast/render.tsx';

const site = {
  url: 'http://localhost:2368',
  title: 'Demo',
  locale: 'en',
  timezone: 'Europe/Berlin',
};

describe('card renderers', () => {
  it('render each card from empty properties, with no scripts', async () => {
    for (const renderer of [renderBigNumber, renderEvent, renderPodcast, renderChart]) {
      const output = await renderer({ card: 'x', properties: {}, site });
      expect(output.html).not.toBe('');
      expect(output.html).not.toContain('<script');
      expect(output.email_html ?? '').not.toContain('<script');
    }
  });

  it('gives static cards the same content in email', async () => {
    const number = await renderBigNumber({
      card: 'big-number',
      properties: { number: '€1.2bn' },
      site,
    });
    expect(number.html).toContain('€1.2bn');
    expect(number.email_html).toContain('€1.2bn');
    const event = await renderEvent({
      card: 'event',
      properties: { startsAt: '2026-12-03T19:00:00+01:00' },
      site,
    });
    expect(event.html).toContain('19:00');
    expect(event.email_html).toContain('19:00');
  });

  it('keeps the podcast link private and points email at the post', async () => {
    const output = await renderPodcast({
      card: 'podcast',
      properties: {
        submittedUrl: 'https://secret.example/feed',
        title: 'Episode',
        audioUrl: 'https://a.example/x.mp3',
      },
      site,
    });
    expect(output.public_properties).not.toContain('submittedUrl');
    expect(output.email_html).toContain('data-ghost-post-link');
  });

  it('draws the chart as SVG and lists what the live frame needs', async () => {
    const output = await renderChart({ card: 'chart', properties: {}, site });
    expect(output.html).toContain('<svg');
    expect(output.public_properties).toContain('table');
    // Email waits for the picture the settings panel uploads.
    expect(output.email_html).toBe('');
  });
});
