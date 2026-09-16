import type { BuilderProvider } from './curated-models';

export interface BuilderCredentialStore {
  get(provider: BuilderProvider): string | undefined;
  set(provider: BuilderProvider, credential: string): void;
  forget(provider: BuilderProvider): void;
  clear(): void;
}

const providers: readonly BuilderProvider[] = ['openai', 'openai-codex', 'anthropic'];
const keyPrefix = 'ghost-builder.credential.';

export class SessionCredentialStore implements BuilderCredentialStore {
  private readonly storage: Storage;

  constructor(storage: Storage = globalThis.sessionStorage) {
    this.storage = storage;
  }

  get(provider: BuilderProvider): string | undefined {
    return this.storage.getItem(`${keyPrefix}${provider}`) ?? undefined;
  }

  set(provider: BuilderProvider, credential: string): void {
    const value = credential.trim();
    if (!value) {
      this.forget(provider);
      return;
    }
    this.storage.setItem(`${keyPrefix}${provider}`, value);
  }

  forget(provider: BuilderProvider): void {
    this.storage.removeItem(`${keyPrefix}${provider}`);
  }

  clear(): void {
    providers.forEach((provider) => this.forget(provider));
  }
}

export class DevelopmentCredentialStore implements BuilderCredentialStore {
  private readonly persistent: SessionCredentialStore;
  private readonly session: SessionCredentialStore;

  constructor(
    persistentStorage: Storage = globalThis.localStorage,
    sessionStorage: Storage = globalThis.sessionStorage,
  ) {
    this.persistent = new SessionCredentialStore(persistentStorage);
    this.session = new SessionCredentialStore(sessionStorage);
  }

  get(provider: BuilderProvider): string | undefined {
    const persisted = this.persistent.get(provider);
    if (persisted) {
      return persisted;
    }
    const existing = this.session.get(provider);
    if (existing) {
      this.persistent.set(provider, existing);
    }
    return existing;
  }

  set(provider: BuilderProvider, credential: string): void {
    this.persistent.set(provider, credential);
  }

  forget(provider: BuilderProvider): void {
    this.persistent.forget(provider);
    this.session.forget(provider);
  }

  clear(): void {
    this.persistent.clear();
    this.session.clear();
  }
}

export function createBuilderCredentialStore(): BuilderCredentialStore {
  return import.meta.env.DEV ? new DevelopmentCredentialStore() : new SessionCredentialStore();
}

export function clearBuilderSessionCredentials(storage: Storage = globalThis.sessionStorage): void {
  new SessionCredentialStore(storage).clear();
}
