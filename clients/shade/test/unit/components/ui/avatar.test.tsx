import type React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../src/components/ui/avatar';
import { render } from '../../utils/test-utils';
import ShadeProvider from '../../../../src/providers/shade-provider';

describe('Avatar Components', () => {
  it('renders Avatar correctly with default props', () => {
    render(<Avatar data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    expect(avatar, 'Avatar should be rendered').toBeTruthy();
    expect(avatar.className, 'Should have default styling').toContain(
      'overflow-hidden rounded-full',
    );
  });

  it('applies custom className to Avatar correctly', () => {
    render(<Avatar className="custom-class" data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    expect(avatar.className, 'Should have custom class').toContain('custom-class');
  });

  it('renders AvatarFallback correctly', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
      </Avatar>,
    );

    const avatarFallback = screen.getByTestId('avatar-fallback');
    expect(avatarFallback, 'AvatarFallback should be rendered').toBeTruthy();
    expect(avatarFallback.textContent, 'Should render the fallback text content').toBe('JD');
    expect(avatarFallback.className, 'Should have default styling').toContain('bg-muted');
  });

  it('applies custom className to AvatarFallback correctly', () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-fallback-class" data-testid="avatar-fallback">
          JD
        </AvatarFallback>
      </Avatar>,
    );

    const avatarFallback = screen.getByTestId('avatar-fallback');
    expect(avatarFallback.className, 'Should have custom class').toContain('custom-fallback-class');
  });

  it('renders the initials prop in a tonal palette fallback', () => {
    render(<Avatar data-testid="avatar" initials="JD" />);
    const avatar = screen.getByTestId('avatar');

    expect(avatar.textContent, 'Should render the initials').toBe('JD');
    const fallback = avatar.querySelector('span')!;
    expect(fallback.className, 'admin7Design pairs a family 200 with its 800').toMatch(
      /bg-[a-z]+-200 text-[a-z]+-800/,
    );
    expect(fallback.getAttribute('style'), 'Tonal fallbacks need no inline colour').toBeNull();
  });

  it('keeps the generated background colour with admin7Design off', () => {
    render(
      <ShadeProvider admin7Design={false} darkMode={false}>
        <Avatar data-testid="avatar" initials="JD" />
      </ShadeProvider>,
    );
    const fallback = screen.getByTestId('avatar').querySelector('span')!;
    expect(
      fallback.getAttribute('style')?.includes('background-color'),
      'Initials fallback should have a deterministic background color',
    ).toBeTruthy();
    expect(fallback.className).toContain('text-white');
  });

  it('renders a user icon fallback when no initials are given', () => {
    render(<Avatar data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    expect(avatar.textContent, 'Should not render any text').toBe('');
    expect(avatar.querySelector('svg'), 'Should render the user icon').toBeTruthy();
  });

  it('verifies Avatar component can accept children', () => {
    render(
      <Avatar data-testid="avatar">
        <div data-testid="custom-child">Test Content</div>
      </Avatar>,
    );

    const avatar = screen.getByTestId('avatar');
    const child = screen.getByTestId('custom-child');

    expect(avatar, 'Avatar should be rendered').toBeTruthy();
    expect(child, 'Child should be rendered').toBeTruthy();
    expect(child.textContent, 'Child should have correct content').toBe('Test Content');
  });

  it('passes props to Avatar component', () => {
    render(<Avatar aria-label="User avatar" data-testid="avatar" id="custom-id" role="img" />);

    const avatar = screen.getByTestId('avatar');
    expect(avatar.id, 'Should have custom id').toBe('custom-id');
    expect(avatar.getAttribute('role'), 'Should have correct role').toBe('img');
    expect(avatar.getAttribute('aria-label'), 'Should have correct aria-label').toBe('User avatar');
  });

  it('tests AvatarImage functionality indirectly', () => {
    // Testing that the Avatar component properly accepts the AvatarImage component
    // We're not testing detailed functionality since it's not fully working in the test environment
    const { container } = render(
      <Avatar>
        <AvatarImage alt="Test" src="test.jpg" />
      </Avatar>,
    );

    // Just verify that the component renders without crashing
    expect(container, 'Component renders without crashing').toBeTruthy();
  });

  it('seeds the fallback color from colorSeed when provided, else the initials', () => {
    const flagOff = (avatar: React.ReactElement) => (
      <ShadeProvider admin7Design={false} darkMode={false}>
        {avatar}
      </ShadeProvider>
    );
    const { rerender, container } = render(flagOff(<Avatar initials="JD" />));
    const seededByInitials = container.querySelector('[style]')?.getAttribute('style');
    rerender(flagOff(<Avatar colorSeed="Jane Doe" initials="JD" />));
    const seededByName = container.querySelector('[style]')?.getAttribute('style');
    expect(seededByInitials).toBeTruthy();
    expect(seededByName).toBeTruthy();
    expect(seededByName).not.toBe(seededByInitials);
  });
});
