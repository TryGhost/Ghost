import assert from 'node:assert/strict';
import * as net from 'node:net';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import express from 'express';
import { once } from 'node:events';
import { promisify } from 'node:util';

import { GhostServer } from '../../../core/server/ghost-server';

describe('GhostServer', function () {
  beforeEach(function () {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');
    sinon.stub(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
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
          testmode: false,
        },
      });

      await assert.rejects(ghostServer.start(express()), { message: /EADDRINUSE/ });
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
          testmode: false,
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
          testmode: false,
        },
      });

      await ghostServer.start(app);
      onTestFinished(async () => {
        await ghostServer.stop();
      });

      const addressInfo = ghostServer._address();
      assert(addressInfo, 'Ghost server should be listening on a host and port');
      const { address, port } = addressInfo;
      const res = await fetch(`http://${address}:${port}/`);
      const text = await res.text();
      assert.equal(text, 'Hello world');
    });

    /*
  describe('_cleanup', function () {
    it('runs every task even when one rejects', async function () {
      const slow = sinon.stub().resolves();
      server.registerCleanupTask(() => Promise.reject(new Error('nope')), 'failing task');
      server.registerCleanupTask(slow, 'Email batch sending');

      // Rejects so the exit code still reflects the failure...
      await assert.rejects(server._cleanup(), /1 cleanup task\(s\) failed: failing task/);

      // ...but only after the sibling ran to completion. Rejecting early would
      // exit the process mid-drain and orphan email batches in `submitting`.
      sinon.assert.calledOnce(slow);
    });

    it('resolves when every task succeeds', async function () {
      server.registerCleanupTask(() => Promise.resolve(), 'a');
      server.registerCleanupTask(() => Promise.resolve(), 'b');

      await server._cleanup();
    });
  });

  describe('_preStop', function () {
    it('runs every task before the server drain, isolating failures', function () {
      const second = sinon.stub();
      server.registerPreStopTask(() => {
        throw new Error('nope');
      }, 'failing signal');
      server.registerPreStopTask(second, 'Email batch sending (stop claiming)');

      // Must not throw — a bad signal cannot skip the drain and cleanup that follow.
      server._preStop();

      sinon.assert.calledOnce(second);
    });

    it('has run before the HTTP server is stopped', async function () {
      const order: string[] = [];
      server.registerPreStopTask(() => order.push('pre-stop'), 'stop claiming');
      server.registerCleanupTask(async () => {
        order.push('cleanup');
      }, 'drain');
      sinon.stub(server, '_stopServer').callsFake(async () => {
        order.push('stop-server');
      });
      server.httpServer = { listening: true };

      await server.stop();

      assert.deepEqual(order, ['pre-stop', 'stop-server', 'cleanup']);
    });
  });
  */
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
          testmode: false,
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

      assert.equal(ghostServer._address(), null);
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
          testmode: false,
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
