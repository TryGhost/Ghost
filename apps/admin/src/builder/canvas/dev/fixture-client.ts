import type { ThemeFixtureId } from './fixture';

export type FixtureRender = {
  fixtureId: ThemeFixtureId;
  requestId: number;
  revision: string;
  html: Record<'home' | 'post', string>;
  inlineTextTargets: Record<string, string>;
  editMarkerAttribute: string;
  editedFile?: { path: string; content: string };
};
type Edit = { marker: string; tagName: string; newText: string; expectedRevision: string };

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
        request.reject(new Error(event.data.error));
      } else {
        request.resolve(event.data);
      }
    };
    this.worker.onerror = (event) => this.dispose(new Error(event.message));
  }

  render(edit?: Edit): Promise<FixtureRender> {
    if (this.disposed) {
      return Promise.reject(new DOMException('Fixture worker stopped.', 'AbortError'));
    }
    this.sequence += 1;
    const requestId = this.sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          this.dispose(
            new Error('Fixture rendering timed out. Reload the local fixture to recover.'),
          ),
        30_000,
      );
      this.pending.set(requestId, { resolve, reject, timeout });
      this.worker.postMessage({ fixtureId: this.fixtureId, requestId, edit });
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
