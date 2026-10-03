import type { ThemeFixtureId } from './fixture';
import type { FixtureDataSnapshot } from './recorded-content';

export type FixtureRender = {
  fixtureId: ThemeFixtureId;
  requestId: number;
  revision: string;
  dataGeneration: number;
  dataSnapshot: FixtureDataSnapshot;
  renderKey: string;
  unchanged?: boolean;
  html: Record<'home' | 'post', string>;
  inlineTextTargets: Record<string, string>;
  editMarkerAttribute: string;
  editedFile?: { path: string; content: string };
};
type Edit = {
  marker: string;
  tagName: string;
  newText: string;
  expectedRevision: string;
  expectedDataGeneration?: number;
};
export type FixtureRefresh = {
  snapshot: FixtureDataSnapshot;
  expectedRevision: string;
  expectedDataGeneration: number;
};

/** A worker rejection adopted nothing; lost transport has an uncertain outcome. */
export class FixtureRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixtureRejectedError';
  }
}
export class FixtureTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixtureTransportError';
  }
}

/** Local prototype transport. Once submitted, an edit waits for its actual outcome. */
export class FixtureClient {
  private readonly worker: Worker;
  private sequence = 0;
  private disposed = false;
  private readonly fixtureId: ThemeFixtureId;
  private readonly pending = new Map<
    number,
    {
      resolve: (result: FixtureRender) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(fixtureId: ThemeFixtureId) {
    this.fixtureId = fixtureId;
    this.worker = new Worker(new URL('./fixture.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<FixtureRender & { error?: string }>) => {
      const request = this.pending.get(event.data.requestId);
      if (!request || event.data.fixtureId !== this.fixtureId) {
        return;
      }
      clearTimeout(request.timeout);
      this.pending.delete(event.data.requestId);
      if (event.data.error) {
        request.reject(new FixtureRejectedError(event.data.error));
      } else {
        request.resolve(event.data);
      }
    };
    this.worker.onerror = (event) => this.dispose(new FixtureTransportError(event.message));
  }

  render(edit?: Edit): Promise<FixtureRender> {
    return this.request({ edit });
  }

  refresh(refresh: FixtureRefresh): Promise<FixtureRender> {
    return this.request({ refresh });
  }

  private request(operation: { edit?: Edit; refresh?: FixtureRefresh }): Promise<FixtureRender> {
    if (this.disposed) {
      return Promise.reject(new DOMException('Fixture worker stopped.', 'AbortError'));
    }
    this.sequence += 1;
    const requestId = this.sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          this.dispose(
            new FixtureTransportError(
              'Fixture rendering timed out. Reload the local fixture to recover.',
            ),
          ),
        30_000,
      );
      this.pending.set(requestId, { resolve, reject, timeout });
      this.worker.postMessage({ fixtureId: this.fixtureId, requestId, ...operation });
    });
  }

  dispose(error: Error = new DOMException('Fixture closed.', 'AbortError')) {
    this.disposed = true;
    this.worker.terminate();
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}
