import assert from 'node:assert/strict';
import net from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';
import config from '../../../../core/shared/config';

/** Where the integration globalSetup found Redis (vitest-globalsetup-services.ts). */
export const redis = {
  host: config.get('adapters:Redis:host') || '127.0.0.1',
  port: Number(config.get('adapters:Redis:port') || 6379),
};

/**
 * Sits between a transport and Redis so a test can take the connection away:
 * `cut()` closes it and refuses new ones until `restore()`, and `silence()`
 * leaves it open but passes nothing on, as a firewall that forgot the
 * connection does. `silence({newConnections: true})` also accepts new ones
 * without answering, as a load balancer with a dead backend does, until
 * `answer()`. `stallOn(command)` lets a connection through until it sends that
 * command, and then goes silent on it, until `answer()`. `sent(text)` resolves
 * once a client has sent that text, even on a silenced connection, so a test
 * knows a command left before it acts. `failOn(text, error)` answers a command
 * containing that text with that Redis error instead of passing it on, and
 * keeps the connection open, until `answer()`.
 */
export class RedisProxy {
  readonly #server: net.Server;
  readonly #pairs = new Set<{
    client: net.Socket;
    upstream: net.Socket;
    silent: boolean;
    /** The end of what the client sent, so a command split across chunks still matches. */
    sent: string;
  }>();
  #refusing = false;
  #silent = false;
  #stallOn: string | null = null;
  #failOn: { text: string; error: string } | null = null;
  #accepted = 0;
  readonly #watchers = new Set<{ text: string; resolve: () => void }>();

  constructor(target: { host: string; port: number }) {
    this.#server = net.createServer((client) => {
      if (this.#refusing) {
        client.destroy();
        return;
      }
      this.#accepted += 1;
      const pair = { client, upstream: net.connect(target), silent: this.#silent, sent: '' };
      this.#pairs.add(pair);
      for (const [from, to] of [
        [pair.client, pair.upstream],
        [pair.upstream, pair.client],
      ]) {
        from.on('data', (chunk: Buffer) => {
          if (from === pair.client) {
            const sent = pair.sent + chunk.toString().toLowerCase();
            if (this.#stallOn && sent.includes(this.#stallOn)) {
              pair.silent = true;
            }
            for (const watcher of this.#watchers) {
              if (sent.includes(watcher.text)) {
                this.#watchers.delete(watcher);
                watcher.resolve();
              }
            }
            if (this.#failOn && sent.includes(this.#failOn.text)) {
              pair.sent = '';
              pair.client.write(`-${this.#failOn.error}\r\n`);
              return;
            }
            pair.sent = sent.slice(-32);
          }
          if (!pair.silent) {
            to.write(chunk);
          }
        });
        from.on('error', () => {});
        from.on('close', () => {
          to.destroy();
          this.#pairs.delete(pair);
        });
      }
    });
  }

  async listen(): Promise<{ host: string; port: number }> {
    await new Promise<void>((resolve) => {
      this.#server.listen(0, '127.0.0.1', resolve);
    });
    return { host: '127.0.0.1', port: (this.#server.address() as net.AddressInfo).port };
  }

  cut() {
    this.#refusing = true;
    for (const pair of this.#pairs) {
      pair.client.destroy();
    }
  }

  restore() {
    this.#refusing = false;
  }

  silence({ newConnections = false } = {}) {
    this.#silent = newConnections;
    for (const pair of this.#pairs) {
      pair.silent = true;
    }
  }

  /** How many connections it has let through, so a test can tell a client did not reconnect. */
  get accepted(): number {
    return this.#accepted;
  }

  sent(text: string): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.#watchers.add({ text: text.toLowerCase(), resolve });
    return promise;
  }

  failOn(text: string, error: string) {
    this.#failOn = { text: text.toLowerCase(), error };
  }

  stallOn(command: string) {
    this.#stallOn = command.toLowerCase();
  }

  answer() {
    this.#silent = false;
    this.#stallOn = null;
    this.#failOn = null;
  }

  async close() {
    this.cut();
    await new Promise((resolve) => {
      this.#server.close(resolve);
    });
  }
}

export async function eventually(condition: () => boolean | Promise<boolean>, message: string) {
  const deadline = Date.now() + 5000;
  while (!(await condition())) {
    if (Date.now() > deadline) {
      assert.fail(message);
    }
    await wait(10);
  }
}
