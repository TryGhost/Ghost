const AnnouncementVisibilityValues = require('./AnnouncementVisibilityValues');

class AnnouncementBarSettings {
    #getAnnouncementSettings;

    static VisibilityValues = AnnouncementVisibilityValues;

    /**
     *
     * @param {Object} deps
     * @param {() => {announcement: string, announcement_visibility: string[], announcement_background: string}} deps.getAnnouncementSettings
     */
    constructor(deps) {
        this.#getAnnouncementSettings = deps.getAnnouncementSettings;
    }

    /**
     * @param {Object} [member]
     * @param {string} member.status
     * @returns {{announcement: string, announcement_background: string}}
     */
    getAnnouncementSettings(member) {
        let announcement = undefined;

        // NOTE: combination of 'free_members' & 'paid_members' makes just a 'members' filter
        const announcementSettings = this.#getAnnouncementSettings();

        if (announcementSettings.announcement) {
            const visibilities = announcementSettings.announcement_visibility;
            const announcementContent = announcementSettings.announcement;

            if (visibilities.length === 0) {
                announcement = undefined;
            } else {
                if (visibilities.includes(AnnouncementVisibilityValues.VISITORS) && !member) {
                    announcement = announcementContent;
                } else if (visibilities.includes(AnnouncementVisibilityValues.FREE_MEMBERS) && (member?.status === 'free')) {
                    announcement = announcementContent;
                } else if (visibilities.includes(AnnouncementVisibilityValues.PAID_MEMBERS) && (member && member.status !== 'free')) {
                    announcement = announcementContent;
                }
            }
        }

        if (announcement !== undefined) {
            return {
                announcement,
                announcement_background: announcementSettings.announcement_background
            };
        }
    }
}

module.exports = AnnouncementBarSettings;
