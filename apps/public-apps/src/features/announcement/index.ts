/**
 * Announcement Bar Feature
 *
 * Displays a dismissible announcement bar at the top of the page.
 * Settings are fetched from Ghost's announcement API.
 */

import {createRoot} from 'react-dom/client';
import {createElement} from 'react';
import {createApi} from '../../runtime/api';
import type {LoaderConfig} from '../../loader';
import {AnnouncementBar} from './AnnouncementBar';

export interface AnnouncementConfig extends LoaderConfig {
    // Preview mode attributes
    preview?: string;
    announcement?: string;
    announcementBackground?: string;
}

export async function initAnnouncement(config: AnnouncementConfig): Promise<void> {
    // Check if we're in preview mode
    const isPreview = config.preview === 'true';

    if (isPreview) {
        // Preview mode - use data from attributes
        renderAnnouncementBar({
            announcement: config.announcement || '',
            announcement_background: (config.announcementBackground as 'light' | 'accent' | 'dark') || 'accent'
        });
        return;
    }

    // Normal mode - fetch settings from API
    const api = createApi({ghost: config.ghost, key: config.key});
    const settings = await api.getAnnouncement();

    if (!settings || !settings.announcement) {
        return; // No announcement configured
    }

    renderAnnouncementBar(settings);
}

function renderAnnouncementBar(settings: {
    announcement: string;
    announcement_background: 'light' | 'accent' | 'dark';
}): void {
    // Create root element
    const root = document.createElement('div');
    root.id = 'ghost-announcement-bar-root';
    document.body.prepend(root);

    // Render React component
    createRoot(root).render(
        createElement(AnnouncementBar, {settings})
    );
}
