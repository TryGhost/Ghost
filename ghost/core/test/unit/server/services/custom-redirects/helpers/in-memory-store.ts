import type {RedirectConfig, RedirectsStore} from '../../../../../../core/server/services/custom-redirects/types';

export class InMemoryStore implements RedirectsStore {
    private redirects: RedirectConfig[] = [];

    async getAll(): Promise<RedirectConfig[]> {
        return this.redirects.map(r => ({...r}));
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        this.redirects = redirects.map(r => ({...r}));
    }
}
