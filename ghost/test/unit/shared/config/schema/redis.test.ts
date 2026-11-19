import assert from 'node:assert/strict';
import { redisConnection } from '../../../../../core/shared/config/schema/redis';

describe('redisConnection', function () {
  it('leaves an unset host and port to ioredis', function () {
    assert.deepEqual(redisConnection.parse({}), {});
  });

  it('coerces a quoted port', function () {
    assert.equal(redisConnection.parse({ port: '6380' }).port, 6380);
  });

  it('reads null credentials as none', function () {
    const connection = redisConnection.parse({ username: null, password: null });

    assert.equal(connection.username, undefined);
    assert.equal(connection.password, undefined);
  });

  it('reads all-digit credentials parsed from the environment as strings', function () {
    const connection = redisConnection.parse({ username: 111, password: 222 });

    assert.equal(connection.username, '111');
    assert.equal(connection.password, '222');
  });

  it('turns tls: true into default TLS options, and false into none', function () {
    assert.deepEqual(redisConnection.parse({ tls: true }).tls, {});
    assert.equal(redisConnection.parse({ tls: false }).tls, undefined);
    assert.deepEqual(redisConnection.parse({ tls: { servername: 'redis' } }).tls, {
      servername: 'redis',
    });
  });

  it('passes other ioredis options through', function () {
    assert.deepEqual(redisConnection.parse({ host: 'redis', keyPrefix: 'ghost:' }), {
      host: 'redis',
      keyPrefix: 'ghost:',
    });
  });

  it('parses its own output unchanged', function () {
    const once = redisConnection.parse({ password: 1, tls: true, db: 2, family: 6 });
    assert.deepEqual(redisConnection.parse(once), once);
  });

  for (const value of [
    null,
    { port: 0 },
    { port: 'abc' },
    { port: 70000 },
    { host: '' },
    { db: -1 },
    { tls: 'yes' },
  ]) {
    it(`rejects ${JSON.stringify(value)}`, function () {
      assert.equal(redisConnection.safeParse(value).success, false);
    });
  }
});
