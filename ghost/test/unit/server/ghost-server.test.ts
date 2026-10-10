import assert from 'node:assert/strict';
import * as net from 'node:net';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import express from 'express';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { setImmediate } from 'node:timers/promises';
import { GhostServer } from '../../../core/server/ghost-server';

describe('GhostServer', function () {
  let signalListeners: Map<NodeJS.Signals, NodeJS.SignalsListener[]>;

  beforeEach(function () {
    signalListeners = new Map(
      (['SIGINT', 'SIGTERM'] as const).map((signal) => [
        signal,
        process.rawListeners(signal) as NodeJS.SignalsListener[],
      ]),
    );
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');
    sinon.stub(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
    for (const [signal, listeners] of signalListeners) {
      process.removeAllListeners(signal);
      for (const listener of listeners) {
        process.on(signal, listener);
      }
    }
  });

  describe('start', function () {
    it('errors if the address is already in use', async function () {
      const otherServer = net.createServer();
      const otherServerListeningPromise = once(otherServer, 'listening');
      otherServer.listen(0);
      await otherServerListeningPromise;
      const otherServerInfo = otherServer.address();
      assert(
        otherServerInfo && typeof otherServerInfo === 'object',
        'Test setup: other server should be listening on a host and port',
      );
      onTestFinished(async () => {
        await promisify(otherServer.close.bind(otherServer))();
      });

      const ghostServer = new GhostServer({
        url: 'http://localhost:2368',
        env: 'testing',
        serverConfig: {
          host: otherServerInfo.address,
          port: otherServerInfo.port,
          shutdownTimeout: 1,
        },
      });

      await assert.rejects(ghostServer.start(express()), {
        message: /EADDRINUSE/,
      });
    });

    it('errors if the server cannot be started', async function () {
      const ghostServer = new GhostServer({
        url: 'http://localhost:2368',
        env: 'testing',
        serverConfig: {
          // Bogus host.
          host: '192.0.2.1',
          port: 0,
          shutdownTimeout: 1,
        },
      });

      await assert.rejects(ghostServer.start(express()));
    });

    it('starts the server', async function () {
      const app = express();
      app.get('/', (_req, res) => {
        res.send('Hello world');
      });

      const ghostServer = new GhostServer({
        url: 'http://localhost:2368',
        env: 'testing',
        serverConfig: {
          host: '127.0.0.1',
          port: 0,
          shutdownTimeout: 1,
        },
      });

      await ghostServer.start(app);
      onTestFinished(async () => {
        await ghostServer.stop();
      });

      const addressInfo = ghostServer.__testOnlyAddress();
      assert(addressInfo, 'Ghost server should be listening on a host and port');
      const { address, port } = addressInfo;
      const res = await fetch(`http://${address}:${port}/`);
      const text = await res.text();
      assert.equal(text, 'Hello world');
    });
  });

  describe('stop', function () {
    let ghostServer: GhostServer;

    beforeEach(function () {
      ghostServer = new GhostServer({
        url: 'http://localhost:2368',
        env: 'testing',
        serverConfig: {
          host: '127.0.0.1',
          port: 0,
          shutdownTimeout: 1,
        },
      });
    });

    it('can be called even if the server is not running', async function () {
      await assert.doesNotReject(ghostServer.stop());
    });

    it('stops the server and runs pre- and post-stop tasks', async function () {
      const prestopOk = sinon.stub();
      const prestopThrower = sinon.stub().throws(new Error('nope'));
      const cleanupOk = sinon.stub();
      ghostServer.registerPreStopTask(prestopOk, 'pre-stop ok');
      ghostServer.registerPreStopTask(prestopThrower, 'pre-stop thrower');
      ghostServer.registerCleanupTask(cleanupOk, 'cleanup ok');
      await ghostServer.start(express());

      await ghostServer.stop();

      assert.equal(ghostServer.__testOnlyAddress(), null);
      sinon.assert.callOrder(prestopOk, prestopThrower, cleanupOk);
    });

    it('rejects if any cleanup tasks reject, but calls them all', async function () {
      const cleanup1 = sinon.stub();
      const cleanup2 = sinon.stub();
      ghostServer.registerCleanupTask(cleanup1);
      ghostServer.registerCleanupTask(() => Promise.reject(new Error('nope')), 'bad');
      ghostServer.registerCleanupTask(cleanup2);
      await ghostServer.start(express());

      await assert.rejects(ghostServer.stop(), /1 cleanup task\(s\) failed: bad/);

      sinon.assert.calledOnce(cleanup1);
      sinon.assert.calledOnce(cleanup2);
    });

    it('signals pre-stop before draining HTTP and keeps dependencies until the request finishes', async function () {
      const requestStarted = Promise.withResolvers<void>();
      const releaseRequest = Promise.withResolvers<void>();
      let dependencyAvailable = true;
      const preStop = sinon.stub();
      const cleanup = sinon.stub().callsFake(async () => {
        dependencyAvailable = false;
      });
      ghostServer = new GhostServer({
        url: 'http://localhost',
        env: 'testing',
        serverConfig: { host: '127.0.0.1', port: 0, shutdownTimeout: 1000 },
      });
      const stopHTTP = sinon.spy(ghostServer, '_stopServer');
      ghostServer.registerPreStopTask(() => {
        throw new Error('pre-stop failure');
      }, 'failed pre-stop');
      ghostServer.registerPreStopTask(preStop, 'stop claiming');
      ghostServer.registerCleanupTask(cleanup, 'dependency');
      const app = express();
      app.get('/', async (_req, res) => {
        requestStarted.resolve();
        await releaseRequest.promise;
        res.status(dependencyAvailable ? 200 : 503).send('request finished');
      });

      await ghostServer.start(app);
      const address = ghostServer.__testOnlyAddress();
      assert(address);
      const response = fetch(`http://127.0.0.1:${address.port}/`);
      let stopping: Promise<void> | undefined;
      try {
        await requestStarted.promise;
        stopping = ghostServer.stop();
        // A failed pre-stop task must not prevent its siblings or HTTP drain.
        sinon.assert.calledOnce(preStop);
        sinon.assert.callOrder(preStop, stopHTTP);
        sinon.assert.notCalled(cleanup);
        releaseRequest.resolve();
        const result = await response;
        assert.equal(result.status, 200);
        assert.equal(await result.text(), 'request finished');
        await stopping;
        sinon.assert.calledOnce(cleanup);
        assert.equal(ghostServer.__testOnlyAddress(), null);
      } finally {
        releaseRequest.resolve();
        await Promise.allSettled([response, stopping ?? ghostServer.stop()]);
      }
    });

    it('starts cleanup concurrently and waits for every sibling before reporting failures', async function () {
      const drain = Promise.withResolvers<void>();
      const order: string[] = [];
      ghostServer.registerCleanupTask(async () => {
        order.push('draining');
        await drain.promise;
        order.push('drained');
      }, 'slow dependency');
      ghostServer.registerCleanupTask(async () => {
        order.push('failed');
        throw new Error('cleanup failure');
      }, 'failed dependency');
      ghostServer.registerCleanupTask(async () => {
        order.push('finished');
      }, 'healthy dependency');

      // Observe rejection immediately so a broken fail-fast implementation does
      // not produce an unhandled rejection while the other task is deferred.
      const stopped = ghostServer.stop().then(
        () => ({ error: undefined }),
        (error: unknown) => ({ error }),
      );
      let settled = false;
      void stopped.then(() => {
        settled = true;
      });
      try {
        await setImmediate();
        assert.deepEqual(order, ['draining', 'failed', 'finished']);
        assert.equal(settled, false);
        drain.resolve();
        const { error } = await stopped;
        assert(error instanceof Error);
        assert.match(error.message, /1 cleanup task\(s\) failed: failed dependency/);
        assert.deepEqual(order, ['draining', 'failed', 'finished', 'drained']);
      } finally {
        drain.resolve();
        await stopped;
      }
    });
  });

  describe('shutdown', function () {
    let ghostServer: GhostServer;
    let ghostServerStopStub: sinon.SinonStub;
    let processExitStub: sinon.SinonStub;

    beforeEach(function () {
      ghostServer = new GhostServer({
        url: 'http://localhost:2368',
        env: 'testing',
        serverConfig: {
          host: '127.0.0.1',
          port: 0,
          shutdownTimeout: 1,
        },
      });

      ghostServerStopStub = sinon.stub(ghostServer, 'stop').resolves();
      processExitStub = sinon.stub(process, 'exit');
    });

    it('stops the server and exits the process', async function () {
      await ghostServer.shutdown();

      sinon.assert.callOrder(ghostServerStopStub, processExitStub);
    });

    it('exits with a specified error code if specified', async function () {
      await ghostServer.shutdown(123);

      sinon.assert.calledWith(processExitStub, 123);
    });

    it('is a no-op if called multiple times', async function () {
      await ghostServer.shutdown();
      await ghostServer.shutdown();
      await ghostServer.shutdown();

      sinon.assert.calledOnce(ghostServerStopStub);
      sinon.assert.calledOnce(processExitStub);
    });

    it('exits with status code 1 if the server stop fails', async function () {
      ghostServerStopStub.rejects(new Error('nope'));

      await ghostServer.shutdown();

      sinon.assert.calledWith(processExitStub, 1);
    });
  });
});
