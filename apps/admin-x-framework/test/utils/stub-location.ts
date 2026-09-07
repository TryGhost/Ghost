/// <reference types="vitest/globals" />

let originalLocation: Location;

// jsdom's window.location cannot be spied on, so tests that assert against a
// redirect swap in a plain object for the duration of the test
export const stubLocation = () => {
  originalLocation = window.location;
  delete (window as unknown as { location?: Location }).location;

  (window as unknown as { location: unknown }).location = {
    href: 'http://localhost:3000/ghost/',
    hash: '#/posts',
    origin: 'http://localhost:3000',
    pathname: '/ghost/',
    replace: vi.fn(),
  };
};

export const restoreLocation = () => {
  (window as unknown as { location: Location }).location = originalLocation;
};
