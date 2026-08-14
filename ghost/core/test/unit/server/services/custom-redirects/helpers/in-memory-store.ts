import {RedirectsStoreBase, type RedirectConfig} from '@tryghost/adapter-base-redirects'

export class InMemoryStore extends RedirectsStoreBase {
    private redirects: RedirectConfig[] = [];

    async getAll(): Promise<RedirectConfig[]> {
        return this.redirects.map(r => ({...r}));
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        this.redirects = redirects.map(r => ({...r}));
    }
}
