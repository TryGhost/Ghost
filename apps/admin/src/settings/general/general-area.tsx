import { useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";

import { Analytics } from "./analytics";
import { PublicationLanguage } from "./publication-language";
import { SeoMeta } from "./seo-meta";
import { SocialAccounts } from "./social-accounts";
import { TimeZone } from "./time-zone";
import { TitleAndDescription } from "./title-and-description";
import { Users } from "./users";
import { generalKeywords } from "@/settings/app/nav";

/**
 * The General settings area, rebuilt natively: the same groups in the same
 * order as the legacy general-settings.tsx (Analytics lives here too — the
 * legacy file renders it under General despite its membership/ location).
 * Waits for the settings response so every group's form state starts from
 * real settings, the guarantee the legacy GlobalDataProvider gave.
 */
export function GeneralArea() {
    const { data: settingsData } = useBrowseSettings();

    if (!settingsData) {
        return null;
    }

    return (
        <div className="flex flex-col gap-9">
            <TitleAndDescription keywords={generalKeywords.titleAndDescription} />
            <TimeZone keywords={generalKeywords.timeZone} />
            <PublicationLanguage keywords={generalKeywords.publicationLanguage} />
            <Users keywords={generalKeywords.users} />
            <SeoMeta keywords={generalKeywords.metadata} />
            <SocialAccounts keywords={generalKeywords.socialAccounts} />
            <Analytics keywords={generalKeywords.analytics} />
        </div>
    );
}
