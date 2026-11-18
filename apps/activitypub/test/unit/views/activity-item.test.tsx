import { ShadeApp } from '@tryghost/shade/app';
import type { ReactNode } from 'react';
import ActivityItem from '../../../src/components/activities/activity-item';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([false, true])('activity list row actions with admin7Design=%s', (admin7Design) => {
  const render = (children: ReactNode) =>
    renderComponent(
      <ShadeApp admin7Design={admin7Design} darkMode={false}>
        {children}
      </ShadeApp>,
    );
  it('provides a native primary button labelled by the actor and opens blank row space', () => {
    const openProfile = vi.fn();
    render(
      <ActivityItem data-testid="actor-row" onClick={openProfile}>
        <span aria-hidden="true">Avatar</span>
        <span>Alice</span>
      </ActivityItem>,
    );

    const primary = screen.getByRole('button', { name: 'Alice' });
    expect(primary.tagName).toBe('BUTTON');
    expect(primary.tabIndex).toBe(0);
    fireEvent.click(primary);
    expect(openProfile).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('actor-row'));
    expect(openProfile).toHaveBeenCalledTimes(2);
  });

  it('keeps follow controls outside the primary link and independent of navigation', () => {
    const openProfile = vi.fn();
    const follow = vi.fn();
    render(
      <ActivityItem url="https://example.com/alice" onClick={openProfile}>
        <span aria-hidden="true">Avatar</span>
        <span>Alice</span>
        <button type="button" onClick={follow}>
          Follow
        </button>
      </ActivityItem>,
    );

    const primary = screen.getByRole('link', { name: 'Alice' });
    const secondary = screen.getByRole('button', { name: 'Follow' });
    expect(primary.getAttribute('href')).toBe('https://example.com/alice');
    expect(primary.contains(screen.getByText('Alice'))).toBe(true);
    expect(secondary.closest('a')).toBeNull();
    fireEvent.click(secondary);
    expect(follow).toHaveBeenCalledTimes(1);
    expect(openProfile).not.toHaveBeenCalled();
    fireEvent.click(primary);
    expect(openProfile).toHaveBeenCalledTimes(1);
  });

  it('leaves control-only rows static without a primary action or extra tab stop', () => {
    const unblock = vi.fn();
    render(
      <ActivityItem data-testid="domain-row">
        <span>example.com</span>
        <button type="button" onClick={unblock}>
          Unblock
        </button>
      </ActivityItem>,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByTestId('domain-row').tabIndex).toBe(-1);
    fireEvent.click(screen.getByTestId('domain-row'));
    expect(unblock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));
    expect(unblock).toHaveBeenCalledTimes(1);
  });

  it('disables the primary destination while keeping independent controls available', () => {
    const openProfile = vi.fn();
    const follow = vi.fn();
    render(
      <ActivityItem
        data-testid="disabled-row"
        url="https://example.com/alice"
        disabled
        onClick={openProfile}
      >
        <span>Avatar</span>
        <span>Alice</span>
        <button type="button" onClick={follow}>
          Follow
        </button>
      </ActivityItem>,
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Alice' })).toBeNull();
    fireEvent.click(screen.getByTestId('disabled-row'));
    fireEvent.click(screen.getByText('Alice'));
    expect(openProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(follow).toHaveBeenCalledTimes(1);
  });

  it('forwards unhandled URL-only avatar gestures to the native link with their modifiers', () => {
    const follow = vi.fn();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <ActivityItem url="https://example.com/alice">
        <span>Avatar</span>
        <span>Alice</span>
        <button type="button" onClick={follow}>
          Follow
        </button>
      </ActivityItem>,
    );
    const primary = screen.getByRole('link', { name: 'Alice' });
    const click = vi.fn((event: Event) => event.preventDefault());
    primary.addEventListener('click', click);

    fireEvent.click(screen.getByText('Avatar'), {
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
      altKey: true,
    });
    expect(click).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        button: 0,
        ctrlKey: true,
        metaKey: true,
        shiftKey: true,
        altKey: true,
      }),
    );
    fireEvent(
      screen.getByText('Avatar'),
      new MouseEvent('auxclick', {
        bubbles: true,
        cancelable: true,
        button: 1,
        ctrlKey: true,
      }),
    );
    expect(open).toHaveBeenCalledExactlyOnceWith(
      'https://example.com/alice',
      '_blank',
      'noopener,noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(follow).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
