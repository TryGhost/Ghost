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

        return response.ok;
    } catch (error) {
        return false;
    }
}
