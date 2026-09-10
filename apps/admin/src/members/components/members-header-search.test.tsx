import React from 'react';
import { TooltipProvider } from '@tryghost/shade/components';
import MembersHeaderSearch from '@/members/components/members-header-search';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render as testingLibraryRender, screen } from '@testing-library/react';

const render = (ui: React.ReactElement) => testingLibraryRender(ui, { wrapper: TooltipProvider });

describe('MembersHeaderSearch', () => {
  it('renders the current search and emits updates from user input', () => {
    const onSearchChange = vi.fn();

    render(<MembersHeaderSearch search="jamie" onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText<HTMLInputElement>('Search members...');

    expect(input.value).toBe('jamie');

    fireEvent.change(input, { target: { value: 'jamie@example.com' } });

    expect(onSearchChange).toHaveBeenCalledWith('jamie@example.com');
  });

  it('syncs the visible input when the external search changes', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <MembersHeaderSearch search="jamie" onSearchChange={onSearchChange} />,
    );

    rerender(<MembersHeaderSearch search="alex" onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText<HTMLInputElement>('Search members...');

    expect(input.value).toBe('alex');
  });

  it('starts as an icon button and focuses the field when opened', () => {
    render(<MembersHeaderSearch search="" collapsible onSearchChange={vi.fn()} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Search members' }));

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search members' }));
  });

  it('collapses an empty field on blur', () => {
    render(<MembersHeaderSearch search="" collapsible onSearchChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
    fireEvent.blur(screen.getByRole('textbox'));

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Search members' })).toBeTruthy();
  });

  it('returns focus to the icon button when Escape closes an empty field', () => {
    render(<MembersHeaderSearch search="" collapsible onSearchChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Search members' }));
  });

  it('keeps an active search visible without taking focus on page load', () => {
    render(<MembersHeaderSearch search="jamie" collapsible onSearchChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Search members' });

    expect(input.value).toBe('jamie');
    expect(document.activeElement).not.toBe(input);
    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('jamie');
  });

  it('reveals an externally restored search', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <MembersHeaderSearch search="" collapsible onSearchChange={onSearchChange} />,
    );

    rerender(<MembersHeaderSearch search="alex" collapsible onSearchChange={onSearchChange} />);

    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('alex');
  });

  it('stays open while the user clears a restored query', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <MembersHeaderSearch search="alex" collapsible onSearchChange={onSearchChange} />,
    );
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    rerender(<MembersHeaderSearch search="" collapsible onSearchChange={onSearchChange} />);

    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('');
  });
});
