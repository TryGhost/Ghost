import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MemberMapHeader from './member-map-header';

const { loadGeometry } = vi.hoisted(() => ({ loadGeometry: vi.fn() }));
vi.mock('./map-data/world-states.json', () => {
  loadGeometry();
  throw new Error('Map geometry download failed');
});

afterEach(cleanup);

it('keeps header actions usable when geometry cannot be downloaded', async () => {
  const save = vi.fn();
  render(
    <MemberMapHeader geolocation='{"country_code":"US"}' enabled>
      <h1>Member</h1>
      <button type="button" onClick={save}>
        Save
      </button>
    </MemberMapHeader>,
  );
  const button = screen.getByRole('button', { name: 'Save' });
  await waitFor(() => expect(loadGeometry).toHaveBeenCalledOnce());
  expect(screen.getByRole('button', { name: 'Save' })).toBe(button);
  expect(screen.queryByTestId('member-location-map')).toBeNull();
  fireEvent.click(button);
  expect(save).toHaveBeenCalledOnce();
});
