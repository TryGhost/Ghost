import sinon from 'sinon';
import type {
  InvalidationTransport,
  TransportHandlers,
} from '../../../../../core/server/services/invalidations/transport';

/**
 * Records what the registry publishes and lets a test deliver peer messages
 * and connection events through the handlers the registry subscribed with.
 */
export class FakeTransport implements InvalidationTransport {
  handlers: TransportHandlers | undefined;
  readonly publish = sinon.stub<Parameters<InvalidationTransport['publish']>, Promise<void>>();
  readonly close = sinon.stub<[], Promise<void>>().resolves();

  constructor() {
    this.publish.resolves();
  }

  async subscribe(handlers: TransportHandlers) {
    this.handlers = handlers;
  }

  get subscribed(): TransportHandlers {
    if (!this.handlers) {
      throw new Error('The registry has not subscribed to the transport');
    }
    return this.handlers;
  }
}
