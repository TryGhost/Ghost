// Tracks deferred members imports from before they are dispatched until their job has
// finished, email included, so tests can wait for them the way they waited on the legacy
// inline job queue. Test-facing parity only, like the content import's run store: remove it
// with the legacy job manager (HKG-1985) or once the jobs backend can settle for itself.
export class InFlightImports {
  private _keys = new Set<string>();
  private _waiters = new Set<() => void>();

  track(key: string): void {
    this._keys.add(key);
  }

  // Never throws: it runs in the finally block that ends every import job.
  release(key: string): void {
    if (!this._keys.delete(key) || this._keys.size > 0) {
      return;
    }

    for (const resolve of this._waiters) {
      resolve();
    }
    this._waiters.clear();
  }

  allSettled(): Promise<void> {
    if (this._keys.size === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._waiters.add(resolve);
    });
  }
}
