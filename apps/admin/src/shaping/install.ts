import { getResponse } from 'msw';
import { handlers } from './handlers';
import { loadDb } from './db';
import { readMode } from './mode';
import { seedDb } from './seed';
import { setRealFetch } from './real-fetch';
import { mountShapingMenu } from './mount-menu';

// Turns the shaping mocks on before Admin renders (see README.md). Called from
// main.tsx on this branch only.

export const installShapingMocks = async () => {
  const mode = readMode();
  // The prototype menu (bottom-right beaker): mocks on/off and reset.
  mountShapingMenu(mode === 'on');
  if (mode === 'off') {
    return;
  }

  const realFetch = window.fetch.bind(window);
  setRealFetch(realFetch);

  // Seeded on first use and after a reset (see mode.ts).
  if (!loadDb()) {
    await seedDb();
  }

  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await getResponse(handlers, request);
    return response ?? realFetch(input, init);
  };
};
