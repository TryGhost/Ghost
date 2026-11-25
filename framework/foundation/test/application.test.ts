import { EventEmitter } from 'node:events';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineAction } from '#support/define-action';
import { defineListener } from '#support/define-listener';
import { defineProvider } from '#support/define-provider';
import { defineService } from '#support/define-service';
import type { AnyServiceDefinition } from '#support/define-service';
import { ApplicationError, createApplication, instance } from '#foundation/application';

type Settings = { readonly webhook: string };

function fixture() {
  const built: string[] = [];
  const Logger = defineService({
    name: 'logger',
    lifetime: 'process',
    create: () => {
      built.push('logger');
      return { lines: [] as string[] };
    },
  });
  const Settings = defineService({
    name: 'settings',
    lifetime: 'site',
    create: (): Settings => {
      throw new Error('settings are supplied per site');
    },
  });
  const Events = defineService({
    name: 'events',
    lifetime: 'site',
    create: () => new EventEmitter(),
  });
  const Pinger = defineService({
    name: 'pinger',
    lifetime: 'site',
    needs: { logger: Logger, settings: Settings },
    create: ({ logger, settings }) => {
      built.push('pinger');
      return { ping: (what: string) => logger.lines.push(`${settings.webhook} <- ${what}`) };
    },
  });
  const provider = defineProvider({
    name: 'pinger',
    services: [Pinger],
    listeners: [
      defineListener({
        bus: Events,
        event: 'published',
        needs: { pinger: Pinger },
        handle: ({ pinger }, what: string) => pinger.ping(what),
      }),
    ],
  });
  return { built, Logger, Settings, Events, Pinger, provider };
}

describe('createApplication', () => {
  it('builds nothing on create, on boot or on opening a site scope', () => {
    const { built, provider, Settings } = fixture();
    const app = createApplication({ providers: [provider] });
    app.boot();
    app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    expect(built).toEqual([]);
  });

  it('refuses to hand out services before boot', () => {
    const { Logger, provider } = fixture();
    const app = createApplication({ providers: [provider] });
    expect(() => app.get(Logger)).toThrow(ApplicationError);
    expect(() => app.createSiteScope()).toThrow(ApplicationError);
  });

  it('builds a service on first use and keeps one instance per scope', () => {
    const { built, provider, Pinger, Settings } = fixture();
    const app = createApplication({ providers: [provider] });
    app.boot();
    const site = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    const pinger = site.get(Pinger);
    expect(site.get(Pinger)).toBe(pinger);
    expect(built).toEqual(['logger', 'pinger']);
  });

  it('hands a service the built instances of what it needs, typed, however deep', () => {
    const { Pinger, provider, Settings } = fixture();
    const Reporter = defineService({
      name: 'reporter',
      lifetime: 'site',
      needs: { pinger: Pinger, settings: Settings },
      create: ({ pinger, settings }) => {
        expectTypeOf(pinger.ping).toEqualTypeOf<(what: string) => number>();
        expectTypeOf(settings).toEqualTypeOf<Settings>();
        return { report: () => pinger.ping(`report for ${settings.webhook}`) };
      },
    });
    const app = createApplication({ providers: [provider] });
    app.boot();
    const site = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    expect(site.get(Reporter).report()).toBe(1);
    expectTypeOf(site.get(Reporter).report).toEqualTypeOf<() => number>();
  });

  it("hands an action what it needs, then the caller's arguments", () => {
    const { Logger, Pinger, provider, Settings } = fixture();
    const PingTwice = defineAction({
      name: 'ping-twice',
      needs: { pinger: Pinger },
      handle: ({ pinger }, what: string) => [pinger.ping(what), pinger.ping(what)],
    });
    const Caller = defineService({
      name: 'caller',
      lifetime: 'site',
      needs: { pingTwice: PingTwice },
      create: ({ pingTwice }) => ({ call: () => pingTwice('post-1') }),
    });
    const app = createApplication({
      providers: [provider, defineProvider({ name: 'caller', actions: [PingTwice] })],
    });
    app.boot();
    const site = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });

    expectTypeOf(site.get(PingTwice)).toEqualTypeOf<(what: string) => number[]>();
    expect(site.get(PingTwice)('post-0')).toEqual([1, 2]);
    expect(site.get(Caller).call()).toEqual([3, 4]);
    expect(app.get(Logger).lines).toHaveLength(4);
  });

  it('gives an action the lifetime of the shortest-lived thing it needs', () => {
    const { Logger, Pinger } = fixture();
    const noop = () => {};
    expect(defineAction({ name: 'a', handle: noop }).lifetime).toBe('process');
    expect(defineAction({ name: 'b', needs: { logger: Logger }, handle: noop }).lifetime).toBe(
      'process',
    );
    expect(
      defineAction({ name: 'c', needs: { logger: Logger, pinger: Pinger }, handle: noop }).lifetime,
    ).toBe('site');
  });

  it('gives two sites their own site services and one shared process service', () => {
    const { Events, Logger, Pinger, provider, Settings } = fixture();
    const app = createApplication({ providers: [provider] });
    app.boot();
    const a = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    const b = app.createSiteScope({ instances: [instance(Settings, { webhook: 'b' })] });

    expect(a.get(Pinger)).not.toBe(b.get(Pinger));
    expect(a.get(Logger)).toBe(b.get(Logger));
    expect(a.get(Logger)).toBe(app.get(Logger));

    a.get(Events).emit('published', 'post-1');
    b.get(Events).emit('published', 'post-2');
    expect(app.get(Logger).lines).toEqual(['a <- post-1', 'b <- post-2']);
  });

  it('delivers an event to a service that was not built when the event was declared', () => {
    const { built, Events, Logger, provider, Settings } = fixture();
    const app = createApplication({ providers: [provider] });
    app.boot();
    const site = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    expect(built).toEqual([]);
    site.get(Events).emit('published', 'post-1');
    expect(built).toEqual(['logger', 'pinger']);
    expect(app.get(Logger).lines).toEqual(['a <- post-1']);
  });

  it('stops listening and drops instances when a scope is disposed', () => {
    const { Events, Logger, Pinger, provider, Settings } = fixture();
    const app = createApplication({ providers: [provider] });
    app.boot();
    const site = app.createSiteScope({ instances: [instance(Settings, { webhook: 'a' })] });
    const events = site.get(Events);
    site.dispose();
    events.emit('published', 'post-1');
    expect(app.get(Logger).lines).toEqual([]);
    expect(() => site.get(Pinger)).toThrow(/scope that has ended/);
  });

  it('removes the subscriptions it made when a later one fails', () => {
    const calls: string[] = [];
    const bus = {
      on(event: string) {
        calls.push(`on ${event}`);
        if (event === 'second') {
          throw new Error('cannot subscribe');
        }
      },
      removeListener: (event: string) => calls.push(`off ${event}`),
    };
    const Bus = defineService({ name: 'bus', lifetime: 'site', create: () => bus });
    const Service = defineService({ name: 'service', lifetime: 'site', create: () => ({}) });
    const provider = defineProvider({
      name: 'example',
      listeners: ['first', 'second'].map((event) =>
        defineListener({ bus: Bus, event, needs: { service: Service }, handle: () => {} }),
      ),
    });
    const app = createApplication({ providers: [provider] });
    app.boot();
    expect(() => app.createSiteScope()).toThrow('cannot subscribe');
    expect(calls).toEqual(['on first', 'on second', 'off first', 'off second']);
  });

  describe('boot rejects', () => {
    it('a process service that needs a site service', () => {
      const { Settings } = fixture();
      const Cache = defineService({
        name: 'cache',
        lifetime: 'process',
        needs: { settings: Settings },
        create: () => ({}),
      });
      const app = createApplication({
        providers: [defineProvider({ name: 'cache', services: [Cache] })],
      });
      expect(() => app.boot()).toThrow(
        '"cache" lives for the process but needs "settings" (as settings), which lives only for one site.',
      );
    });

    it('a per-site service listening on a process-wide bus', () => {
      const { Pinger } = fixture();
      const Bus = defineService({
        name: 'bus',
        lifetime: 'process',
        create: () => new EventEmitter(),
      });
      const provider = defineProvider({
        name: 'pinger',
        listeners: [
          defineListener({
            bus: Bus,
            event: 'published',
            needs: { pinger: Pinger },
            handle: () => {},
          }),
        ],
      });
      expect(() => createApplication({ providers: [provider] }).boot()).toThrow(
        /Every site would react to the same event/,
      );
    });

    it('services that need each other in a circle', () => {
      const needs: Record<string, AnyServiceDefinition> = {};
      const A = defineService({ name: 'a', lifetime: 'process', create: () => ({}) });
      const B = defineService({
        name: 'b',
        lifetime: 'process',
        needs: { a: A },
        create: () => ({}),
      });
      // A definition is frozen, so a circle can only be made by going around the types.
      const C = { name: 'c', lifetime: 'process' as const, needs, create: () => ({}) };
      needs.b = B;
      needs.c = C;
      const app = createApplication({
        providers: [defineProvider({ name: 'circle', services: [C] })],
      });
      expect(() => app.boot()).toThrow('Services need each other in a circle: c → c.');
    });

    it('an instance given to a scope of the wrong lifetime', () => {
      const { Logger, provider, Settings } = fixture();
      expect(() =>
        createApplication({
          providers: [provider],
          instances: [instance(Settings, { webhook: 'a' })],
        }),
      ).toThrow(/a process scope cannot be given its instance/);
      const app = createApplication({ providers: [provider] });
      app.boot();
      expect(() => app.createSiteScope({ instances: [instance(Logger, { lines: [] })] })).toThrow(
        /a site scope cannot be given its instance/,
      );
    });
  });
});
