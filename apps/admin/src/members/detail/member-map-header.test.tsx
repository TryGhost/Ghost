import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MemberMapHeader from './member-map-header';

const { loadMap } = vi.hoisted(() => ({ loadMap: vi.fn() }));
vi.mock('./member-location-map', () => {
  return {
    default: () => {
      loadMap();
      throw new Error('Map rendering failed');
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('member map loading', () => {
  it('does not render the map while disabled', () => {
    render(
      <MemberMapHeader enabled={false}>
        <h1>Member</h1>
      </MemberMapHeader>,
    );
    expect(screen.getByRole('heading', { name: 'Member' })).toBeTruthy();
    expect(loadMap).not.toHaveBeenCalled();
  });

  it('keeps the member header and actions usable when map rendering fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const save = vi.fn();
    render(
      <MemberMapHeader geolocation='{"country_code":"US"}' enabled>
        <h1>Member</h1>
        <button type="button" onClick={save}>
          Save
        </button>
      </MemberMapHeader>,
    );
    await waitFor(() => expect(errors).toHaveBeenCalled());
    expect(loadMap).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Member' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledOnce();
  });
});
