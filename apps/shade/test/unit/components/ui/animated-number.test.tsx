import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AnimatedNumber } from '../../../../src/components/ui/animated-number';
import { render, screen, waitFor } from '../../utils/test-utils';

// Waits for the lazy NumberFlow element to replace the fallback
async function numberFlowIn(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('number-flow-react')).not.toBeNull());
  return container.querySelector('number-flow-react') as HTMLElement;
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
        Comments <FreshAnimatedNumber data-testid="count" locales="en-US" value={1234} />
      </h1>,
    );

    expect(container.querySelector('number-flow-react')).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('1,234');
    expect(screen.getByRole('heading', { name: 'Comments 1,234' })).toBeTruthy();
  });

  it('reads the number once, and reads the new number when it changes', async () => {
    // jsdom never defines NumberFlow's custom element, so updates need `isolate`
    const { container, rerender } = render(
      <h1>
        Comments <AnimatedNumber value={12} isolate />
      </h1>,
    );
    await numberFlowIn(container);

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
        style={{ color: 'red' }}
        value={12}
      />,
    );
    const element = await numberFlowIn(container);

    expect(screen.getByTestId('count')).toBe(element);
    expect(element.classList.contains('text-lg')).toBe(true);
    expect(element.style.color).toBe('red');
  });

  it('reads the number with its locale, format, prefix and suffix', async () => {
    render(
      <h1>
        Total{' '}
        <AnimatedNumber
          format={{ minimumFractionDigits: 2 }}
          locales="de-DE"
          prefix="~"
          suffix=" left"
          value={1234.5}
        />
      </h1>,
    );

    expect(await screen.findByRole('heading', { name: 'Total ~1.234,50 left' })).toBeTruthy();
  });

  it('reads Intl.Locale objects for different locales in their own locale', async () => {
    render(
      <>
        <h1>
          German <AnimatedNumber locales={new Intl.Locale('de-DE')} value={1234} />
        </h1>
        <h2>
          English <AnimatedNumber locales={new Intl.Locale('en-US')} value={1234} />
        </h2>
      </>,
    );

    expect(await screen.findByRole('heading', { name: 'German 1.234' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'English 1,234' })).toBeTruthy();
  });

  it.each([
    ['aria-hidden', { 'aria-hidden': true }],
    ['the hidden attribute', { hidden: true }],
  ])('reads nothing when the caller hides it with %s', async (_, props) => {
    render(
      <h1>
        Comments <AnimatedNumber {...props} value={12} />
      </h1>,
    );

    expect(await screen.findByRole('heading', { name: 'Comments' })).toBeTruthy();
  });

  it('reads the caller’s label in place of the number', async () => {
    render(
      <h1>
        Comments <AnimatedNumber aria-label="twelve" value={12} />
      </h1>,
    );

    expect(await screen.findByRole('heading', { name: 'Comments twelve' })).toBeTruthy();
  });

  it('reads the number when the label is blank', async () => {
    render(
      <h1>
        Comments <AnimatedNumber aria-label="   " value={12} />
      </h1>,
    );

    expect(await screen.findByRole('heading', { name: 'Comments 12' })).toBeTruthy();
  });

  // React 18 writes `hidden={false}` on a custom element as hidden="false",
  // which hides it
  it('keeps the number visible when hidden is false', async () => {
    const { container } = render(<AnimatedNumber hidden={false} value={12} />);
    const element = await numberFlowIn(container);

    expect(element.hidden).toBe(false);
  });
});
