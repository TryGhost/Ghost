import type {BuilderProvider} from './curated-models';

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
        providers.forEach(provider => this.forget(provider));
    }
}

export function clearBuilderSessionCredentials(storage: Storage = globalThis.sessionStorage): void {
    new SessionCredentialStore(storage).clear();
}
