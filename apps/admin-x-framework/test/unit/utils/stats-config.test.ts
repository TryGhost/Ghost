import {getStatEndpointUrl, getToken} from '../../../src/utils/stats-config';
import {StatsConfig} from '../../../src/providers/FrameworkProvider';
import {getTinybirdToken} from '../../../src/api/tinybird';
import {vi} from 'vitest';

// Mock getTinybirdToken
vi.mock('../../../src/api/tinybird', () => ({
    getTinybirdToken: vi.fn()
}));

describe('stats-config utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('getStatEndpointUrl', () => {
        it('returns empty string when config is null', () => {
            expect(getStatEndpointUrl(null, 'endpoint')).toBe('');
        });

        it('returns empty string when config is undefined', () => {
            expect(getStatEndpointUrl(undefined, 'endpoint')).toBe('');
        });

        it('constructs URL with production endpoint when local is disabled', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com',
                token: 'prod-token'
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('https://api.example.com/v0/pipes/analytics.json?');
        });

        it('constructs URL with local endpoint when local is enabled', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com',
                token: 'prod-token',
                local: {
                    enabled: true,
                    endpoint: 'http://localhost:8000',
                    token: 'local-token'
                }
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('http://localhost:8000/v0/pipes/analytics.json?');
        });

        it('handles missing endpoint gracefully', () => {
            const config: StatsConfig = {
                token: 'token'
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('/v0/pipes/analytics.json?');
        });

        it('handles missing local endpoint when local is enabled', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com',
                local: {
                    enabled: true
                }
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('/v0/pipes/analytics.json?');
        });

        it('appends custom parameters', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com'
            };
            expect(getStatEndpointUrl(config, 'analytics', 'foo=bar&baz=qux')).toBe('https://api.example.com/v0/pipes/analytics.json?foo=bar&baz=qux');
        });

        it('handles undefined endpoint parameter', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com'
            };
            expect(getStatEndpointUrl(config, undefined)).toBe('https://api.example.com/v0/pipes/undefined.json?');
        });

        it('handles empty endpoint parameter', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com'
            };
            expect(getStatEndpointUrl(config, '')).toBe('https://api.example.com/v0/pipes/.json?');
        });

        it('prefers local config when enabled even if local endpoint is missing', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com',
                local: {
                    enabled: true,
                    endpoint: ''
                }
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('/v0/pipes/analytics.json?');
        });

        it('handles local.enabled being false explicitly', () => {
            const config: StatsConfig = {
                endpoint: 'https://api.example.com',
                local: {
                    enabled: false,
                    endpoint: 'http://localhost:8000'
                }
            };
            expect(getStatEndpointUrl(config, 'analytics')).toBe('https://api.example.com/v0/pipes/analytics.json?');
        });
    });

    describe('getToken', () => {
        const mockTokenFromApi: string = 'api-fetched-token';
        
        describe('when getTinybirdToken returns a token', () => {
            beforeEach(() => {
                vi.clearAllMocks();
                vi.mocked(getTinybirdToken).mockReturnValue({
                    data: {tinybird: {token: mockTokenFromApi}},
                    refetch: vi.fn()
                } as any);
            });     

            it('returns token from getTinybirdToken when it returns a token', () => {
                expect(getToken()).toBe(mockTokenFromApi);
            });
        });

        describe('when getTinybirdToken returns a null token', () => {
            beforeEach(() => {
                vi.clearAllMocks();
                vi.mocked(getTinybirdToken).mockReturnValue({
                    data: {tinybird: {token: null}},
                    refetch: vi.fn()
                } as any);
            });

            it('returns undefined when config is undefined', () => {
                expect(getToken(undefined)).toBeUndefined();
            });

            it('returns production token when local is not enabled', () => {
                const config: StatsConfig = {
                    token: 'prod-token'
                };
                expect(getToken(config)).toBe('prod-token');
            });

            it('returns local token when local is enabled', () => {
                const config: StatsConfig = {
                    token: 'prod-token',
                    local: {
                        enabled: true,
                        token: 'local-token'
                    }
                };
                expect(getToken(config)).toBe('local-token');
            });

            it('returns undefined when local is enabled but local token is missing', () => {
                const config: StatsConfig = {
                    token: 'prod-token',
                    local: {
                        enabled: true
                    }
                };
                expect(getToken(config)).toBeUndefined();
            });

            it('returns production token when local.enabled is false', () => {
                const config: StatsConfig = {
                    token: 'prod-token',
                    local: {
                        enabled: false,
                        token: 'local-token'
                    }
                };
                expect(getToken(config)).toBe('prod-token');
            });

            it('returns undefined when no tokens are provided', () => {
                const config: StatsConfig = {
                    endpoint: 'https://api.example.com'
                };
                expect(getToken(config)).toBeUndefined();
            });

            it('handles empty token strings', () => {
                const config: StatsConfig = {
                    token: ''
                };
                expect(getToken(config)).toBe('');
            });

            it('handles null config object', () => {
                expect(getToken(null as any)).toBeUndefined();
            });
        });
    });
});