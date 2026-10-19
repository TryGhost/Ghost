import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MemberMapHeader from './member-map-header';

const { finishLoading, loaded } = vi.hoisted(() => {
  let resolveGeometry!: () => void;
  const geometryReady = new Promise<void>((resolve) => {
    resolveGeometry = resolve;
  });
  return { finishLoading: resolveGeometry, loaded: geometryReady };
});

vi.mock('./map-data/world-states.json', async (importOriginal) => {
  // Keep the real geometry pending while the user opens a header action.
  await loaded;
  return importOriginal();
});

function HeaderActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Actions
      </button>
      {open && <button type="button">Impersonate</button>}
    </>
  );
}

afterEach(cleanup);

it('keeps an open action available when the map finishes loading', async () => {
  render(
    <MemberMapHeader geolocation='{"country_code":"US"}' enabled>
      <HeaderActions />
    </MemberMapHeader>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
  expect(screen.getByRole('button', { name: 'Impersonate' })).toBeTruthy();
  await act(async () => {
    finishLoading();
    await loaded;
  });
  await screen.findByTestId('member-location-map');
  expect(screen.getByRole('button', { name: 'Impersonate' })).toBeTruthy();
});
