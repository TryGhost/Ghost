import Module from 'node:module';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import * as transform from '../../src/index.ts';

describe('Decoder restriction', function () {
  let requireSharp: sinon.SinonStub;
  let sharp: { block: sinon.SinonStub; unblock: sinon.SinonStub };

  beforeEach(function () {
    sharp = { block: sinon.stub(), unblock: sinon.stub() };
    requireSharp = sinon
      .stub(Module.prototype, 'require')
      .callThrough()
      .withArgs('sharp')
      .returns(sharp);
  });

  afterEach(function () {
    transform.setAllowedDecoders(null);
    sinon.restore();
  });

  it('does not load sharp when the decoders are set', function () {
    transform.setAllowedDecoders(['VipsForeignLoadPng']);

    sinon.assert.notCalled(requireSharp);
  });

  it('restricts the decoders when sharp is first loaded', function () {
    transform.setAllowedDecoders(['VipsForeignLoadJpeg', 'VipsForeignLoadPng']);

    transform.getSharp();
    transform.getSharp();

    sinon.assert.calledOnceWithExactly(sharp.block, { operation: ['VipsForeignLoad'] });
    sinon.assert.calledOnceWithExactly(sharp.unblock, {
      operation: ['VipsForeignLoadJpeg', 'VipsForeignLoadPng'],
    });
    sinon.assert.callOrder(sharp.block, sharp.unblock);
  });

  it('restricts the decoders before a probe returns', function () {
    transform.setAllowedDecoders(['VipsForeignLoadPng']);

    transform.canTransformFiles();

    sinon.assert.calledOnce(sharp.block);
  });

  it('applies a changed restriction on the next load', function () {
    transform.setAllowedDecoders(['VipsForeignLoadJpeg']);
    transform.getSharp();

    transform.setAllowedDecoders(['VipsForeignLoadPng']);
    transform.getSharp();

    sinon.assert.calledTwice(sharp.block);
    sinon.assert.calledWithExactly(sharp.unblock.secondCall, {
      operation: ['VipsForeignLoadPng'],
    });
  });

  it('lifts the restriction', function () {
    transform.setAllowedDecoders(['VipsForeignLoadPng']);
    transform.getSharp();

    transform.setAllowedDecoders(null);
    transform.getSharp();

    sinon.assert.calledOnce(sharp.block);
    sinon.assert.calledWithExactly(sharp.unblock.lastCall, { operation: ['VipsForeignLoad'] });
  });

  it('does not restrict anything until asked to', function () {
    transform.getSharp();

    sinon.assert.notCalled(sharp.block);
    sinon.assert.notCalled(sharp.unblock);
  });
});
