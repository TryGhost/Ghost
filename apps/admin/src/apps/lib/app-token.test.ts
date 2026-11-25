import {
  type ErrorResponse,
  JSONError,
  SessionExpiredError,
} from '@tryghost/admin-x-framework/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AppTokenSource, createAppTokenHolder } from './app-token';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const tokenExpiringIn = (ms: number, value: string) => ({
  access_token: value,
  expires_in: ms / 1000,
});

/** An error as Admin's API layer raises it for a response with this status and error. */
const apiError = (status: number, error: { code?: string; type?: string } = {}) =>
  new JSONError(new Response('{}', { status }), { errors: [error] } as unknown as ErrorResponse);

/** The token the holder sends a call with now. */
async function tokenOf(holder: AppTokenSource) {
  let sent = '';
  await holder.send((token) => {
    sent = token;
    return Promise.resolve(new Response('{}'));
  });
  return sent;
}

describe('createAppTokenHolder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function holderWith(renew: () => Promise<ReturnType<typeof tokenExpiringIn>>) {
    const onEnded = vi.fn();
    const onError = vi.fn();
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(HOUR, 'ghost_app_first'),
      receivedAt: Date.now(),
      onError,
    });
    return { holder, onEnded, onError, start: () => holder.start({ renew, onEnded }) };
  }

  it('renews about 50 minutes into the hour, and again an hour after that', async () => {
    let issued = 1;
    const renew = vi.fn(() => {
      issued += 1;
      return Promise.resolve(tokenExpiringIn(HOUR, `ghost_app_${issued}`));
    });
    const { holder, start } = holderWith(renew);
    start();

    await vi.advanceTimersByTimeAsync(49 * MINUTE);
    expect(renew).not.toHaveBeenCalled();
    expect(await tokenOf(holder)).toBe('ghost_app_first');

    await vi.advanceTimersByTimeAsync(1 * MINUTE);
    expect(renew).toHaveBeenCalledOnce();
    expect(await tokenOf(holder)).toBe('ghost_app_2');

    await vi.advanceTimersByTimeAsync(50 * MINUTE);
    expect(renew).toHaveBeenCalledTimes(2);
    expect(await tokenOf(holder)).toBe('ghost_app_3');
  });

  it('shares one renewal between the calls that ask for one at the same time', async () => {
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
    const { holder, start } = holderWith(renew);
    start();

    const results = await Promise.all([holder.renew(), holder.renew()]);

    expect(results).toEqual([true, true]);
    expect(renew).toHaveBeenCalledOnce();
  });

  it.each([
    [409, { code: 'APP_SESSION_ENDED' }],
    [404, { code: 'APP_NOT_INSTALLED' }],
    [403, { code: 'APP_STAFF_SESSION_REQUIRED' }],
    [403, { type: 'NoPermissionError' }],
    [409, { code: 'APP_TOKENS_UNAVAILABLE' }],
  ])('ends the session when Ghost refuses a renewal with %i %o', async (status, error) => {
    const renew = vi.fn(() => Promise.reject(apiError(status, error)));
    const { holder, onEnded, onError, start } = holderWith(renew);
    start();

    expect(await holder.renew()).toBe(false);
    expect(onEnded).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();

    // Nothing more is asked for once the session has ended
    expect(await holder.renew()).toBe(false);
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(renew).toHaveBeenCalledOnce();
  });

  it('keeps the session when a renewal fails with a status that ends one, but another code', async () => {
    const renew = vi.fn(() => Promise.reject(apiError(409, { code: 'SOME_OTHER_CONFLICT' })));
    const { holder, onEnded, onError, start } = holderWith(renew);
    start();

    expect(await holder.renew()).toBe(false);
    expect(onEnded).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it.each([
    [401, {}],
    // How Ghost refuses a request with no staff session, which Admin's API layer reads as expired
    [403, { errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }] }],
  ])(
    'leaves an expired staff session (%i) to Admin, which signs in again, without ending the session, reporting or retrying',
    async (status, data) => {
      const expired = new SessionExpiredError(new Response('{}', { status }), data);
      const renew = vi.fn(() => Promise.reject(expired));
      const { holder, onEnded, onError, start } = holderWith(renew);
      start();

      expect(await holder.renew()).toBe(false);
      expect(onError).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2 * HOUR);
      expect(renew).toHaveBeenCalledOnce();
    },
  );

  it('keeps the session and tries again a minute later when a renewal fails otherwise', async () => {
    const renew = vi
      .fn<() => Promise<ReturnType<typeof tokenExpiringIn>>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(tokenExpiringIn(HOUR, 'ghost_app_renewed'));
    const { holder, onEnded, onError, start } = holderWith(renew);
    start();

    expect(await holder.renew()).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    expect(onEnded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(await tokenOf(holder)).toBe('ghost_app_renewed');
  });

  it.each([
    ['no token', undefined],
    ['a token without a value', { expires_in: 3600 }],
    ['a token without a lifetime', { access_token: 'ghost_app_renewed' }],
    ['a token that has expired', { access_token: 'ghost_app_renewed', expires_in: 0 }],
  ])('keeps the token it holds when Ghost answers a renewal with %s', async (_what, answer) => {
    const renew = vi
      .fn<() => Promise<ReturnType<typeof tokenExpiringIn> | undefined>>()
      .mockResolvedValueOnce(answer as ReturnType<typeof tokenExpiringIn> | undefined)
      .mockResolvedValueOnce(tokenExpiringIn(HOUR, 'ghost_app_renewed'));
    const onEnded = vi.fn();
    const onError = vi.fn();
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(HOUR, 'ghost_app_first'),
      receivedAt: Date.now(),
      onError,
    });
    holder.start({ renew, onEnded });

    expect(await holder.renew()).toBe(false);
    expect(await tokenOf(holder)).toBe('ghost_app_first');
    expect(onError).toHaveBeenCalledOnce();
    expect(onEnded).not.toHaveBeenCalled();

    // Tried again as any failed renewal is
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(await tokenOf(holder)).toBe('ghost_app_renewed');
  });

  it('backs off a renewal that keeps failing, then stops renewing on a timer but keeps the session', async () => {
    const renew = vi.fn(() => Promise.reject(apiError(500)));
    const { holder, onEnded, onError, start } = holderWith(renew);
    start();

    await holder.renew();
    for (const [wait, calls] of [
      [MINUTE, 2],
      [2 * MINUTE, 3],
      [4 * MINUTE, 4],
      [8 * MINUTE, 5],
    ] as const) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(renew).toHaveBeenCalledTimes(calls - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(renew).toHaveBeenCalledTimes(calls);
    }

    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(renew).toHaveBeenCalledTimes(5);
    // Ghost being unreachable isn't a refusal: the app keeps running, with its unsaved work
    expect(onEnded).not.toHaveBeenCalled();
    // One outage, one report
    expect(onError).toHaveBeenCalledOnce();
  });

  describe('once Ghost answers again', () => {
    const refusedToken = () =>
      new Response('{"errors":[{"code":"APP_TOKEN_INVALID"}]}', { status: 401 });

    it('renews on the next call Ghost refuses for its token, then on a timer again', async () => {
      let reachable = false;
      const renew = vi.fn(() =>
        reachable
          ? Promise.resolve(tokenExpiringIn(HOUR, `ghost_app_${renew.mock.calls.length}`))
          : Promise.reject(new TypeError('Failed to fetch')),
      );
      const { holder, onEnded, start } = holderWith(renew);
      start();
      await holder.renew();
      await vi.advanceTimersByTimeAsync(2 * HOUR);
      expect(renew).toHaveBeenCalledTimes(5);

      reachable = true;
      const call = vi.fn((token: string) =>
        Promise.resolve(token === 'ghost_app_first' ? refusedToken() : new Response('{}')),
      );
      expect((await holder.send(call)).status).toBe(200);
      expect(renew).toHaveBeenCalledTimes(6);
      expect(onEnded).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(50 * MINUTE);
      expect(renew).toHaveBeenCalledTimes(7);
    });

    it('asks Ghost at most once a minute for calls refused while renewals fail', async () => {
      const renew = vi.fn(() => Promise.reject(apiError(503)));
      const { holder, onError, start } = holderWith(renew);
      start();
      const call = vi.fn(() => Promise.resolve(refusedToken()));

      for (let sent = 0; sent < 5; sent += 1) {
        expect((await holder.send(call)).status).toBe(401);
      }
      expect(renew).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(MINUTE - 1);
      await holder.send(call);
      expect(renew).toHaveBeenCalledOnce();

      // The retry the timer had set out, which the calls share
      await vi.advanceTimersByTimeAsync(1);
      expect(renew).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('reports a new outage after a renewal worked in between', async () => {
      const renew = vi
        .fn<() => Promise<ReturnType<typeof tokenExpiringIn>>>()
        .mockRejectedValueOnce(apiError(500))
        .mockResolvedValueOnce(tokenExpiringIn(HOUR, 'ghost_app_renewed'))
        .mockRejectedValueOnce(apiError(500));
      const { holder, onError, start } = holderWith(renew);
      start();

      await holder.renew();
      await vi.advanceTimersByTimeAsync(MINUTE);
      await vi.advanceTimersByTimeAsync(50 * MINUTE);

      expect(renew).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  it('tries a failed renewal again a minute later when the browser’s clock goes back meanwhile', async () => {
    const renew = vi
      .fn<() => Promise<ReturnType<typeof tokenExpiringIn>>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(tokenExpiringIn(HOUR, 'ghost_app_renewed'));
    const { holder, start } = holderWith(renew);
    start();

    expect(await holder.renew()).toBe(false);
    vi.setSystemTime(Date.now() - HOUR);
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(renew).toHaveBeenCalledTimes(2);
    expect(await tokenOf(holder)).toBe('ghost_app_renewed');
  });

  it('keeps renewing on schedule when the browser’s clock jumps mid-life', async () => {
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
    const { start } = holderWith(renew);
    start();

    await vi.advanceTimersByTimeAsync(30 * MINUTE);
    vi.setSystemTime(Date.now() - 24 * HOUR);
    await vi.advanceTimersByTimeAsync(20 * MINUTE);
    expect(renew).toHaveBeenCalledOnce();

    vi.setSystemTime(Date.now() + 24 * HOUR);
    await vi.advanceTimersByTimeAsync(50 * MINUTE);
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it('counts the first token’s lifetime from when it arrived, not from when the holder was made', async () => {
    const receivedAt = Date.now();
    await vi.advanceTimersByTimeAsync(30 * MINUTE);
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(HOUR, 'ghost_app_first'),
      receivedAt,
      onError: vi.fn(),
    });
    holder.start({ renew, onEnded: vi.fn() });

    await vi.advanceTimersByTimeAsync(20 * MINUTE - 1);
    expect(renew).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(renew).toHaveBeenCalledOnce();
  });

  it('renews a token that ends with the staff session every 5 minutes, until Ghost refuses', async () => {
    // Ghost issues no token that outlives the staff session behind it, which ends in 4 minutes
    const sessionEndsAt = Date.now() + 4 * MINUTE;
    const renew = vi.fn(() =>
      Date.now() < sessionEndsAt
        ? Promise.resolve(tokenExpiringIn(sessionEndsAt - Date.now(), 'ghost_app_renewed'))
        : Promise.reject(apiError(403, { code: 'APP_STAFF_SESSION_REQUIRED' })),
    );
    const onEnded = vi.fn();
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(4 * MINUTE, 'ghost_app_first'),
      receivedAt: Date.now(),
      onError: vi.fn(),
    });
    holder.start({ renew, onEnded });

    // Due at once, as it expires within 10 minutes, then not again for 5 minutes, by which time
    // the staff session has ended
    await vi.advanceTimersByTimeAsync(0);
    expect(renew).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5 * MINUTE);
    expect(renew).toHaveBeenCalledTimes(2);
    expect(onEnded).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(HOUR);
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it('renews at most every 5 minutes, even for a token that’s due at once', async () => {
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(5 * MINUTE, 'ghost_app_renewed')));
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(5 * MINUTE, 'ghost_app_first'),
      receivedAt: Date.now(),
      onError: vi.fn(),
    });
    holder.start({ renew, onEnded: vi.fn() });

    // Once at once, as the token looks due, then no more than every 5 minutes
    await vi.advanceTimersByTimeAsync(15 * MINUTE);

    expect(renew).toHaveBeenCalledTimes(4);
  });

  it('doesn’t end a session it was stopped for while a renewal was out', async () => {
    let refuse!: () => void;
    const renew = vi.fn(
      () =>
        new Promise<ReturnType<typeof tokenExpiringIn>>((_resolve, reject) => {
          refuse = () => reject(apiError(409, { code: 'APP_SESSION_ENDED' }));
        }),
    );
    const { holder, onEnded, start } = holderWith(renew);
    start();

    const renewing = holder.renew();
    holder.stop();
    refuse();

    expect(await renewing).toBe(false);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('ends the session once started again, when Ghost refused a renewal while it was stopped', async () => {
    let refuse!: () => void;
    const renew = vi.fn(
      () =>
        new Promise<ReturnType<typeof tokenExpiringIn>>((_resolve, reject) => {
          refuse = () => reject(apiError(409, { code: 'APP_SESSION_ENDED' }));
        }),
    );
    const { holder, onEnded, start } = holderWith(renew);
    start();

    const renewing = holder.renew();
    holder.stop();
    refuse();
    await renewing;
    expect(onEnded).not.toHaveBeenCalled();

    start();
    expect(onEnded).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(renew).toHaveBeenCalledOnce();
  });

  it('waits for a token that expires further off than a timer can wait', async () => {
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
    const holder = createAppTokenHolder({
      token: tokenExpiringIn(365 * 24 * HOUR, 'ghost_app_first'),
      receivedAt: Date.now(),
      onError: vi.fn(),
    });
    holder.start({ renew, onEnded: vi.fn() });

    await vi.advanceTimersByTimeAsync(HOUR);

    expect(renew).not.toHaveBeenCalled();
  });

  it('renews nothing on a timer once stopped, and starts again', async () => {
    const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
    const { holder, start } = holderWith(renew);
    start();
    holder.stop();

    await vi.advanceTimersByTimeAsync(HOUR);
    expect(renew).not.toHaveBeenCalled();

    start();
    await vi.advanceTimersByTimeAsync(0);
    expect(renew).toHaveBeenCalledOnce();
  });

  describe('send', () => {
    const refusedToken = () =>
      new Response('{"errors":[{"code":"APP_TOKEN_INVALID"}]}', { status: 401 });
    const ok = () => new Response('{"posts":[]}');

    it('renews a refused token once and sends the call again with the new one', async () => {
      const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
      const { holder, start } = holderWith(renew);
      start();
      const call = vi.fn<(token: string) => Promise<Response>>();
      call.mockResolvedValueOnce(refusedToken()).mockResolvedValueOnce(ok());

      const response = await holder.send(call);

      expect(response.status).toBe(200);
      expect(renew).toHaveBeenCalledOnce();
      expect(call.mock.calls).toEqual([['ghost_app_first'], ['ghost_app_renewed']]);
    });

    it('gives back the refusal when the token was refused again, or couldn’t be renewed', async () => {
      const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
      const { holder, start } = holderWith(renew);
      start();
      const call = vi.fn(() => Promise.resolve(refusedToken()));

      expect((await holder.send(call)).status).toBe(401);
      expect(call).toHaveBeenCalledTimes(2);

      const refused = holderWith(() => Promise.reject(apiError(409)));
      refused.start();
      const once = vi.fn(() => Promise.resolve(refusedToken()));
      expect((await refused.holder.send(once)).status).toBe(401);
      expect(once).toHaveBeenCalledOnce();
    });

    it('sends again with the token held now, without renewing, when another call already renewed it', async () => {
      const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
      const { holder, start } = holderWith(renew);
      start();
      const call = vi.fn<(token: string) => Promise<Response>>();
      call
        .mockImplementationOnce(async () => {
          // Another call's renewal lands while this one is out
          await holder.renew();
          return refusedToken();
        })
        .mockResolvedValueOnce(ok());

      const response = await holder.send(call);

      expect(response.status).toBe(200);
      expect(renew).toHaveBeenCalledOnce();
      expect(call.mock.calls).toEqual([['ghost_app_first'], ['ghost_app_renewed']]);
    });

    it('doesn’t renew the token for any other refusal', async () => {
      const renew = vi.fn(() => Promise.resolve(tokenExpiringIn(HOUR, 'ghost_app_renewed')));
      const { holder, start } = holderWith(renew);
      start();
      const call = vi.fn(() =>
        Promise.resolve(new Response('{"errors":[{"code":"NO_PERMISSION"}]}', { status: 401 })),
      );

      await holder.send(call);

      expect(renew).not.toHaveBeenCalled();
      expect(call).toHaveBeenCalledOnce();
    });
  });
});
