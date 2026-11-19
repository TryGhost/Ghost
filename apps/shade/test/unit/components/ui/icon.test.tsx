import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Icon from '../../../../src/components/ui/icon';
import { render } from '../../utils/test-utils';

const icons = Object.entries(Icon);

describe('Icon', () => {
  it('has icons to check', () => {
    expect(icons.length).toBeGreaterThan(0);
  });

  it.each(icons)(
    'Icon.%s is decorative by default, without vendor text or fixed ids',
    (_name, IconComponent) => {
      const { container } = render(<IconComponent />);
      const svg = container.querySelector('svg');

      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.hasAttribute('role')).toBe(false);
      expect(container.querySelector('title, desc')).toBeNull();
      expect(container.querySelector('[id]')).toBeNull();
    },
  );

  it.each(icons)(
    'Icon.%s does not add vendor text to the name of the control it sits in',
    (_name, IconComponent) => {
      render(
        <button type="button">
          <IconComponent />
          Save
        </button>,
      );

      expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
      expect(screen.getByRole('button').textContent).toBe('Save');
    },
  );

  it('can render the same icon twice without duplicate ids', () => {
    const { container } = render(
      <>
        <Icon.SkullAndBones />
        <Icon.SkullAndBones />
      </>,
    );

    expect(container.querySelectorAll('[id]')).toHaveLength(0);
  });

  it('is named by a title', () => {
    render(<Icon.ErrorFill title="Error" />);
    const svg = screen.getByRole('img', { name: 'Error' });

    expect(svg.hasAttribute('aria-hidden')).toBe(false);
    expect(svg.hasAttribute('title')).toBe(false);
  });

  it('is named by aria-labelledby', () => {
    render(
      <>
        <span id="icon-name">Success</span>
        <Icon.SuccessFill aria-labelledby="icon-name" />
      </>,
    );

    expect(screen.getByRole('img', { name: 'Success' })).toBeTruthy();
  });

  it('is named by aria-label and keeps its size classes', () => {
    render(<Icon.InfoFill aria-label="Information" size="lg" />);
    const svg = screen.getByRole('img', { name: 'Information' });

    expect(svg.hasAttribute('aria-hidden')).toBe(false);
    expect(svg.getAttribute('class')).toContain('size-6');
  });

  it('lets the caller override the defaults', () => {
    const { container } = render(
      <>
        <Icon.Typography aria-hidden={false} />
        <Icon.InfoFill role="graphics-symbol" title="Information" />
      </>,
    );
    const [typography, info] = Array.from(container.querySelectorAll('svg'));

    expect(typography.getAttribute('aria-hidden')).toBe('false');
    expect(info.getAttribute('role')).toBe('graphics-symbol');
    expect(info.getAttribute('aria-label')).toBe('Information');
  });

  it('stays hidden when the caller hides a named icon', () => {
    const { container } = render(<Icon.ErrorFill title="Error" aria-hidden />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps the defaults when a prop is passed through as undefined', () => {
    const { container } = render(<Icon.Typography aria-hidden={undefined} />);
    render(<Icon.ErrorFill role={undefined} title="Error" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('img', { name: 'Error' })).toBeTruthy();
  });
});
