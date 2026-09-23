import { createHmac } from 'node:crypto';
import { parseConfiguration } from '../model.ts';
import type { Post } from './selection.ts';

export interface MemberCredential {
  uuid: string;
  key: string;
}
export interface AccessDecision {
  access: boolean;
  visible_card_ids: string[];
  card_revision?: string;
}

export class MemberCredentialError extends Error {}

export class GhostRequestError extends Error {
  status: number;
  constructor(status: number) {
    super('Ghost request failed.');
    this.status = status;
  }
}

/** The provider's only credential and Ghost API boundary. No response or entitlement cache. */
export class GhostClient {
  #base: URL;
  #id: string;
  #secret: Buffer;

  constructor(siteUrl: string, adminKey: string) {
    this.#base = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/admin/`);
    if (
      !['http:', 'https:'].includes(this.#base.protocol) ||
      this.#base.username ||
      this.#base.password ||
      this.#base.search ||
      this.#base.hash
    ) {
      throw new Error('Configure a Ghost HTTP(S) site URL.');
    }
    const [id, secret] = adminKey.split(':');
    if (!/^[\da-f]{24}$/i.test(id ?? '') || !/^[\da-f]{64}$/i.test(secret ?? '')) {
      throw new Error('Configure a Ghost custom integration Admin API key.');
    }
    this.#id = id;
    this.#secret = Buffer.from(secret, 'hex');
  }

  async #request<T>(path: string, body?: unknown): Promise<T> {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'HS256', typ: 'JWT', kid: this.#id })}.${encode({ iat: now, exp: now + 300, aud: '/admin/' })}`;
    const token = `${unsigned}.${createHmac('sha256', this.#secret).update(unsigned).digest('base64url')}`;
    let response;
    try {
      response = await fetch(new URL(path, this.#base), {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v6.0',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new GhostRequestError(503);
    }
    if (!response.ok) {
      if (path === 'post_access/' && response.status === 401) {
        const error = (await response.json().catch(() => null)) as {
          errors?: { code?: string }[];
        } | null;
        if (error?.errors?.[0]?.code === 'MEMBER_CREDENTIAL_INVALID') {
          throw new MemberCredentialError('Invalid member credentials.');
        }
      }
      throw new GhostRequestError(response.status);
    }
    return response.json() as Promise<T>;
  }

  async configuration() {
    const { settings } = await this.#request<{ settings: { key: string; value: string | null }[] }>(
      'settings/',
    );
    const raw = settings.find((setting) => setting.key === 'addons')?.value;
    const installs = raw ? JSON.parse(raw) : [];
    return parseConfiguration(
      installs.find((install: { handle: string }) => install.handle === 'podcast')?.configuration,
    );
  }

  async post(id: string): Promise<Post | null> {
    if (!/^[\da-f]{24}$/i.test(id)) {
      return null;
    }
    const { posts } = await this.#request<{ posts: Post[] }>(
      `posts/?formats=lexical&include=tiers&has_card=addon%3Apodcast%3Aepisode&filter=${encodeURIComponent(`id:${id}+status:published`)}`,
    );
    return posts.find((post) => post.id === id && post.status === 'published') ?? null;
  }

  async access(
    ids: string[],
    member?: MemberCredential | null,
  ): Promise<Map<string, AccessDecision>> {
    const { post_access: decisions } = await this.#request<{
      post_access: ({ id: string } & AccessDecision)[];
    }>('post_access/', { post_access: [{ post_ids: ids, ...(member ? { member } : {}) }] });
    if (
      !Array.isArray(decisions) ||
      ids.some((id) => !decisions.some((post) => post.id === id)) ||
      decisions.some(
        (post) =>
          typeof post.access !== 'boolean' ||
          !Array.isArray(post.visible_card_ids) ||
          post.visible_card_ids.some((id) => typeof id !== 'string'),
      )
    ) {
      throw new GhostRequestError(503);
    }
    return new Map(
      decisions.map((post) => [
        post.id,
        {
          access: post.access,
          visible_card_ids: post.visible_card_ids,
          card_revision: post.card_revision,
        },
      ]),
    );
  }

  async *postPages(): AsyncGenerator<Post[]> {
    let page = 1;
    for (;;) {
      const result = await this.#request<{
        posts: Post[];
        meta: { pagination: { next: number | null } };
      }>(
        `posts/?formats=lexical&include=tiers&has_card=addon%3Apodcast%3Aepisode&filter=status:published&limit=100&order=published_at%20desc,id%20desc&page=${page}`,
      );
      if (!Array.isArray(result.posts)) {
        throw new GhostRequestError(503);
      }
      yield result.posts;
      const next = result.meta?.pagination?.next;
      if (next === null) {
        return;
      }
      if (!Number.isSafeInteger(next) || next <= page) {
        throw new GhostRequestError(503);
      }
      page = next;
    }
  }
}

export function feedCredential(params: URLSearchParams): MemberCredential | null {
  if (!params.has('uuid') && !params.has('key')) {
    return null;
  }
  const uuid = params.get('uuid');
  const key = params.get('key');
  if (
    !uuid ||
    !key ||
    uuid.length > 100 ||
    key.length > 200 ||
    params.getAll('uuid').length !== 1 ||
    params.getAll('key').length !== 1
  ) {
    throw new MemberCredentialError('Invalid member credentials.');
  }
  return { uuid, key };
}
