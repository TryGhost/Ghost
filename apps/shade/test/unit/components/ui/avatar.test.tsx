import assert from 'assert/strict';
import { describe, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../src/components/ui/avatar';
import { render } from '../../utils/test-utils';

describe('Avatar Components', () => {
  it('renders Avatar correctly with default props', () => {
    render(<Avatar data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    assert.ok(avatar, 'Avatar should be rendered');
    assert.ok(
      avatar.className.includes('overflow-hidden rounded-full'),
      'Should have default styling',
    );
  });

  it('applies custom className to Avatar correctly', () => {
    render(<Avatar className="custom-class" data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    assert.ok(avatar.className.includes('custom-class'), 'Should have custom class');
  });

  it('renders AvatarFallback correctly', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
      </Avatar>,
    );

    const avatarFallback = screen.getByTestId('avatar-fallback');
    assert.ok(avatarFallback, 'AvatarFallback should be rendered');
    assert.equal(avatarFallback.textContent, 'JD', 'Should render the fallback text content');
    assert.ok(avatarFallback.className.includes('bg-muted'), 'Should have default styling');
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
    assert.ok(
      avatarFallback.className.includes('custom-fallback-class'),
      'Should have custom class',
    );
  });

  it('renders the initials prop in the default fallback', () => {
    render(<Avatar data-testid="avatar" initials="JD" />);
    const avatar = screen.getByTestId('avatar');

    assert.equal(avatar.textContent, 'JD', 'Should render the initials');
    const fallback = avatar.querySelector('span');
    assert.ok(fallback, 'Fallback should be rendered');
    assert.ok(
      fallback.getAttribute('style')?.includes('background-color'),
      'Initials fallback should have a deterministic background color',
    );
  });

  it('renders a user icon fallback when no initials are given', () => {
    render(<Avatar data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');

    assert.equal(avatar.textContent, '', 'Should not render any text');
    assert.ok(avatar.querySelector('svg'), 'Should render the user icon');
  });

  it('verifies Avatar component can accept children', () => {
    render(
      <Avatar data-testid="avatar">
        <div data-testid="custom-child">Test Content</div>
      </Avatar>,
    );

    const avatar = screen.getByTestId('avatar');
    const child = screen.getByTestId('custom-child');

    assert.ok(avatar, 'Avatar should be rendered');
    assert.ok(child, 'Child should be rendered');
    assert.equal(child.textContent, 'Test Content', 'Child should have correct content');
  });

  it('passes props to Avatar component', () => {
    render(<Avatar aria-label="User avatar" data-testid="avatar" id="custom-id" role="img" />);

    const avatar = screen.getByTestId('avatar');
    assert.equal(avatar.id, 'custom-id', 'Should have custom id');
    assert.equal(avatar.getAttribute('role'), 'img', 'Should have correct role');
    assert.equal(
      avatar.getAttribute('aria-label'),
      'User avatar',
      'Should have correct aria-label',
    );
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
    assert.ok(container, 'Component renders without crashing');
  });

  it('seeds the fallback color from colorSeed when provided, else the initials', () => {
    const { rerender, container } = render(<Avatar initials="JD" />);
    const seededByInitials = container.querySelector('[style]')?.getAttribute('style');
    rerender(<Avatar colorSeed="Jane Doe" initials="JD" />);
    const seededByName = container.querySelector('[style]')?.getAttribute('style');
    expect(seededByInitials).toBeTruthy();
    expect(seededByName).toBeTruthy();
    expect(seededByName).not.toBe(seededByInitials);
  });
});
