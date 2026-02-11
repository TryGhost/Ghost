/**
 * Ghost API Utilities
 *
 * Shared API client for fetching data from Ghost's public APIs.
 */

export interface GhostApiConfig {
    ghost: string;
    key?: string;
}

export class GhostApi {
    private baseUrl: string;

    constructor(config: GhostApiConfig) {
        this.baseUrl = config.ghost.replace(/\/$/, '');
    }

    /**
     * Fetch announcement bar settings
     */
    async getAnnouncement(): Promise<AnnouncementSettings | null> {
        const url = `${this.baseUrl}/members/api/announcement/`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.announcement?.[0] || null;
        } catch (error) {
            console.error('[public-apps] Failed to fetch announcement:', error);
            return null;
        }
    }
}

export interface AnnouncementSettings {
    announcement: string;
    announcement_background: 'light' | 'accent' | 'dark';
}

export function createApi(config: GhostApiConfig): GhostApi {
    return new GhostApi(config);
}
