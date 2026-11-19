import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import * as logos from '../../../src/assets/images';
import { render } from '../utils/test-utils';

const { FacebookLogo, GoogleLogo, XLogo } = logos;

describe('Logos', () => {
  it('has logos to check', () => {
    expect(Object.keys(logos).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(logos))('%s is decorative by default', (_name, Logo) => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.hasAttribute('role')).toBe(false);
    expect(svg?.querySelector('title, desc')).toBeNull();
    expect(svg?.hasAttribute('alt')).toBe(false);
  });

  it.each(Object.entries(logos))(
    '%s does not add to the name of the control it sits in',
    (_name, Logo) => {
      render(
        <button type="button">
          <Logo />
          Facebook card
        </button>,
      );

      expect(screen.getByRole('button', { name: 'Facebook card' })).toBeTruthy();
      expect(screen.getByRole('button').textContent).toBe('Facebook card');
    },
  );

  it.each(Object.entries(logos))('%s is named by a title', (_name, Logo) => {
    render(<Logo title="Brand" />);
    const svg = screen.getByRole('img', { name: 'Brand' });

    expect(svg.hasAttribute('aria-hidden')).toBe(false);
    expect(svg.hasAttribute('title')).toBe(false);
  });

  it.each(Object.entries(logos))('%s is named by aria-label', (_name, Logo) => {
    render(<Logo aria-label="Brand" />);
    const svg = screen.getByRole('img', { name: 'Brand' });

    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('is named by aria-labelledby', () => {
    render(
      <>
        <span id="logo-name">Facebook</span>
        <FacebookLogo aria-labelledby="logo-name" />
      </>,
    );

    expect(screen.getByRole('img', { name: 'Facebook' })).toBeTruthy();
  });

  it('lets the caller override the defaults', () => {
    const { container } = render(<GoogleLogo aria-hidden={false} />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('false');
  });

  it('stays hidden when the caller hides a named logo', () => {
    const { container } = render(<GoogleLogo title="Google" aria-hidden />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps the defaults when a prop is passed through as undefined', () => {
    const { container } = render(<GoogleLogo aria-hidden={undefined} />);
    render(<FacebookLogo role={undefined} title="Facebook" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('img', { name: 'Facebook' })).toBeTruthy();
  });

  it('treats a blank label as no label', () => {
    const { container } = render(
      <>
        <GoogleLogo aria-label="" title="Google" />
        <FacebookLogo title=" " />
        <XLogo aria-labelledby="" />
      </>,
    );
    const [google, facebook, x] = Array.from(container.querySelectorAll('svg'));

    expect(screen.getByRole('img', { name: 'Google' })).toBe(google);
    expect(facebook.getAttribute('aria-hidden')).toBe('true');
    expect(facebook.hasAttribute('role')).toBe(false);
    expect(x.getAttribute('aria-hidden')).toBe('true');
    expect(x.hasAttribute('role')).toBe(false);
  });
});
