import {warn} from '../../shared/log';

export interface AnnouncementPayload {
    announcement: string;
    announcement_background: string;
}

interface AnnouncementResponse {
    announcement?: AnnouncementPayload[];
}

/**
 * Fetch the current viewer's announcement from Ghost's `members/api/announcement/`
 * endpoint. The endpoint applies member-status visibility filtering server-side
 * (see `AnnouncementBarSettings.getAnnouncementSettings(req.member)`), so we
 * just consume the result.
 *
 * `credentials: 'same-origin'` is the fetch default and matches today's
 * announcement-bar app — sends the session cookie so the server can resolve
 * `req.member`.
 */
export async function fetchAnnouncement(siteUrl: string): Promise<AnnouncementPayload | null> {
    let url: string;
    try {
        url = new URL('members/api/announcement/', siteUrl).toString();
    } catch (err) {
        warn(`announcement: invalid siteUrl ${siteUrl}: ${(err as Error).message}`);
        return null;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        if (!response.ok) {
            warn(`announcement API returned HTTP ${response.status}`);
            return null;
        }
        const json = (await response.json()) as AnnouncementResponse;
        const first = json.announcement?.[0];
        if (!first || !first.announcement) {
            return null;
        }
        return {
            announcement: first.announcement,
            announcement_background: first.announcement_background || 'dark'
        };
    } catch (err) {
        warn(`announcement fetch failed: ${(err as Error).message}`);
        return null;
    }
}
