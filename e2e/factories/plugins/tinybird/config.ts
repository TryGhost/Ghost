/**
 * Simple Tinybird configuration from environment variables.
 */
export function getTinybirdConfig() {
    return {
        host: process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events',
        token: process.env.TINYBIRD_TOKEN || 'test-token'
    };
}