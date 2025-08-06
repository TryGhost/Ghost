import {config as appConfig} from '../../../config/config';

export async function isTinybirdAvailable(): Promise<boolean> {
    try {
        const config = appConfig.tinyBird;

        const response = await fetch(`${config.host}/v0/pipes`, {
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
