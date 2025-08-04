import {tinybirdConfig} from '../config/persistence';
import {FetchHttpClient} from '../utils/http-client';

export async function isTinybirdAvailable(): Promise<boolean> {
    try {
        const config = tinybirdConfig();
        const httpClient = new FetchHttpClient();

        const response = await httpClient.fetch(`${config.host}/v0/pipes`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${config.token}`
            }
        });

        if (!response.ok) {
            // eslint-disable-next-line no-console
            console.warn('⚠️  Tinybird is not available. Tinybird tests will be skipped. Run `tb local` to enable these tests.');
        }

        return response.ok;
    } catch (error) {
        return false;
    }
}
