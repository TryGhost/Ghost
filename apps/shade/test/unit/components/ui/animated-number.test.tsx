import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { AnimatedNumber } from '../../../../src/components/ui/animated-number';
import { render, screen, waitFor } from '../../utils/test-utils';

type Props = ComponentProps<typeof AnimatedNumber>;

// Waits for the lazy NumberFlow element to replace the fallback
async function numberFlowIn(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('number-flow-react')).not.toBeNull());
  return container.querySelector('number-flow-react') as HTMLElement;
}

async function renderLoaded(props: Props) {
  const { container } = render(<AnimatedNumber {...props} />);
  return numberFlowIn(container);
}

// The text NumberFlow builds for its own label. Under React 18, NumberFlow
// writes the data it renders to a `data` attribute as JSON
function numberFlowText(element: HTMLElement): string {
  return JSON.parse(element.getAttribute('data') ?? '{}').valueAsString;
}

describe('AnimatedNumber', () => {
  // Load NumberFlow up front, so waiting for it can't time out on a slow run
  beforeAll(async () => {
    await import('@number-flow/react');
  });

  it('shows the number as text while NumberFlow loads', async () => {
    // A fresh module, so NumberFlow hasn't loaded yet whatever ran before
    vi.resetModules();
    const { AnimatedNumber: FreshAnimatedNumber } =
      await import('../../../../src/components/ui/animated-number');
    const { container } = render(
      <h1>
        Comments{' '}
        <FreshAnimatedNumber
          className="text-lg"
          data-testid="count"
          locales="en-US"
          style={{ color: 'red' }}
          value={1234}
        />
      </h1>,
    );
    const fallback = screen.getByTestId('count');

    expect(container.querySelector('number-flow-react')).toBeNull();
    expect(container.querySelector('div')).toBeNull();
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback.textContent).toBe('1,234');
    expect(fallback.getAttribute('aria-hidden')).toBe('true');
    expect(fallback.className).toContain('text-lg');
    expect(fallback.style.color).toBe('red');
    expect(screen.getByRole('heading', { name: 'Comments 1,234' })).toBeTruthy();

    // Then NumberFlow takes the fallback's place, and the heading reads the same
    const element = await numberFlowIn(container);
    expect(screen.getByTestId('count')).toBe(element);
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Comments 1,234' })).toBeTruthy();
  });

  it('reads the number once, with NumberFlow hidden', async () => {
    // jsdom never defines NumberFlow's custom element, so updates need `isolate`
    const { container, rerender } = render(
      <h1>
        Comments <AnimatedNumber value={12} isolate />
      </h1>,
    );
    const element = await numberFlowIn(container);

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Comments 12' })).toBeTruthy();

    rerender(
      <h1>
        Comments <AnimatedNumber value={13} isolate />
      </h1>,
    );
    expect(screen.getByRole('heading', { name: 'Comments 13' })).toBeTruthy();
  });

  it('gives the caller’s className, style and DOM props to the visible number', async () => {
    const { container } = render(
      <AnimatedNumber
        className="text-lg"
        data-testid="count"
        id="count"
        style={{ color: 'red' }}
        value={12}
      />,
    );
    const element = await numberFlowIn(container);

    expect(screen.getByTestId('count')).toBe(element);
    expect(element.id).toBe('count');
    expect(element.getAttribute('class')).toBe('text-lg');
    expect(element.style.color).toBe('red');
  });

  it('keeps the visible number last, after the screen-reader copy', async () => {
    const { container } = render(<AnimatedNumber value={12} />);
    const element = await numberFlowIn(container);

    expect(container.lastElementChild).toBe(element);
    expect(container.firstElementChild?.className).toBe('sr-only');
  });

  it.each<[string, Props]>([
    ['plain', { value: 1234567 }],
    ['currency', { value: 1234567.89, format: { style: 'currency', currency: 'USD' } }],
    ['percent', { value: 0.1234, format: { style: 'percent', minimumFractionDigits: 2 } }],
    [
      'compact',
      {
        value: 1234567,
        format: { notation: 'compact', compactDisplay: 'short', roundingMode: 'trunc' },
      },
    ],
    ['locale', { value: 1234567.5, locales: 'de-DE' }],
    ['Intl.Locale', { value: 1234567.5, locales: new Intl.Locale('de-DE') }],
    ['prefix and suffix', { value: 42, prefix: '~', suffix: '  left' }],
    ['negative', { value: -3, format: { signDisplay: 'always' } }],
  ])('reads the same text NumberFlow shows (%s)', async (_, props) => {
    const element = await renderLoaded(props);

    expect(document.querySelector('.sr-only')?.textContent).toBe(numberFlowText(element));
  });

  it('keeps Intl.Locale objects for different locales apart', async () => {
    const { container } = render(
      <>
        <AnimatedNumber locales={new Intl.Locale('de-DE')} value={1234} />
        <AnimatedNumber locales={new Intl.Locale('en-US')} value={1234} />
      </>,
    );
    await numberFlowIn(container);

    const texts = Array.from(container.querySelectorAll('.sr-only'), (el) => el.textContent);
    expect(texts).toEqual(['1.234', '1,234']);
  });

  it.each<[string, Props]>([
    ['aria-hidden', { value: 12, 'aria-hidden': true }],
    ['the hidden attribute', { value: 12, hidden: true }],
  ])('reads nothing when the caller hides it with %s', async (_, props) => {
    const element = await renderLoaded(props);

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.sr-only')).toBeNull();
  });

  it('reads the caller’s label in place of the number', async () => {
    const { container } = render(
      <h1>
        Comments <AnimatedNumber aria-label="twelve" value={12} />
      </h1>,
    );
    const element = await numberFlowIn(container);

    expect(element.hasAttribute('aria-label')).toBe(false);
    expect(screen.getByRole('heading', { name: 'Comments twelve' })).toBeTruthy();
  });

  it.each(['', '   '])('reads the number when the label is blank (%j)', async (label) => {
    render(
      <h1>
        Comments <AnimatedNumber aria-label={label} value={12} />
      </h1>,
    );

    expect(await screen.findByRole('heading', { name: 'Comments 12' })).toBeTruthy();
  });

  it('doesn’t write hidden="false" when the number is shown', async () => {
    const element = await renderLoaded({ value: 12, hidden: false });

    expect(element.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('.sr-only')?.textContent).toBe('12');
  });
});
