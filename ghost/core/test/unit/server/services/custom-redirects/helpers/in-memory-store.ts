import type {RedirectConfig} from '../../../../../../core/server/services/custom-redirects/redirect-config';
import type {RedirectsStore} from '../../../../../../core/server/services/custom-redirects/redirects-service';

export class InMemoryStore implements RedirectsStore {
    private redirects: RedirectConfig[] = [];

    async getAll(): Promise<RedirectConfig[]> {
        return this.redirects.map(r => ({...r}));
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        this.redirects = redirects.map(r => ({...r}));
    }
}
