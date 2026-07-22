import { Button } from "@tryghost/shade/components";
import { useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Signup forms group, ported from the legacy
 * embed-signup/embed-signup-form.tsx: just the Embed entry into the routed
 * embed dialog.
 */
export function EmbedSignupGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    return (
        <SettingGroup
            customButtons={<Button size="sm" variant="ghost" onClick={() => navigate("/settings/embed-signup-form/show")}>Embed</Button>}
            description="Grow your audience from anywhere on the web"
            keywords={keywords}
            navid="embed-signup-form"
            testId="embed-signup-form"
            title="Signup forms"
        />
    );
}
