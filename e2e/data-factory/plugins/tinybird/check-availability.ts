import {getTinybirdConfig} from './config';
import {FetchHttpClient} from './interfaces';

/**
 * Check if Tinybird service is available
 */
export async function isTinybirdAvailable(): Promise<boolean> {
    try {
        const config = getTinybirdConfig();
        const httpClient = new FetchHttpClient();
        
        // Try to hit the Tinybird endpoint
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