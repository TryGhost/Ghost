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
    'Icon.%s does not add a description to the control it sits in',
    (_name, IconComponent) => {
      render(
        <button type="button">
          <IconComponent />
          Save
        </button>,
      );

      expect(screen.getByRole('button', { name: 'Save', description: '' })).toBeTruthy();
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
  });

  it('is named by aria-label and keeps its size classes', () => {
    render(<Icon.InfoFill aria-label="Information" size="lg" />);
    const svg = screen.getByRole('img', { name: 'Information' });

    expect(svg.hasAttribute('aria-hidden')).toBe(false);
    expect(svg.getAttribute('class')).toContain('size-6');
  });

  it('lets the caller override the defaults', () => {
    const { container } = render(<Icon.Typography aria-hidden={false} />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('false');
  });
});
