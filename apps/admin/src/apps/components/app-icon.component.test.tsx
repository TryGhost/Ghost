import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import { AppIcon, AppNavIcon } from './app-icon';

const ICON_URL = 'https://podcast.example.com/icon.svg';
const manifest = { icon: { url: ICON_URL }, accent_color: '#ff5500' };

describe('An app’s own SVG icon', () => {
  // Shown as an image of its URL, an app's SVG runs none of its scripts and loads nothing
  // it refers to. Admin never reads the SVG itself: drawing it any other way, such as
  // inline to recolor it, needs it sanitized first.
  it.each([
    ['AppIcon', <AppIcon key="icon" manifest={manifest} size="lg" />],
    ['AppNavIcon', <AppNavIcon key="icon" {...manifest} />],
  ])('is drawn by %s only as an image of its URL', async (_, icon) => {
    await renderInApp(<div data-testid="subject">{icon}</div>);

    const subject = page.getByTestId('subject').element();
    expect([...subject.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      ICON_URL,
    ]);
    expect(subject.querySelectorAll('svg, object, embed, iframe')).toHaveLength(0);
  });
});
