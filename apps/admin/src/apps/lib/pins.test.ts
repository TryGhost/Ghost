import { MAX_AUTO_PINNED, pinOnInstall, resetPinsCache, setAppPinned } from './pins';

const pinned = () =>
  JSON.parse(window.localStorage.getItem('ghost-admin:apps:pinned') ?? '[]') as string[];

describe('pins', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPinsCache();
  });

  it('pins new installs until the sidebar is full', () => {
    for (let index = 0; index <= MAX_AUTO_PINNED; index++) {
      pinOnInstall(`app-${index}`);
    }

    expect(pinned()).toEqual(['app-0', 'app-1', 'app-2']);
  });

  it('pins into the room an unpin leaves, without re-pinning the unpinned app', () => {
    pinOnInstall('app-0');
    pinOnInstall('app-1');
    pinOnInstall('app-2');
    setAppPinned('app-1', false);

    pinOnInstall('app-3');

    expect(pinned()).toEqual(['app-0', 'app-2', 'app-3']);
  });
});
