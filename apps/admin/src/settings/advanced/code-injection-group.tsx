import { useState } from "react";
import { Button } from "@tryghost/shade/components";

import { CodeInjectionDialog } from "./code-injection-dialog";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/** The Code injection group, ported from the legacy advanced/code-injection.tsx: an Open button for the full-screen editor. */
export function CodeInjectionGroup({ keywords }: { keywords: string[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <SettingGroup
            customButtons={<Button size="sm" variant="ghost" onClick={() => setIsOpen(true)}>Open</Button>}
            description="Add custom code to your publication."
            keywords={keywords}
            navid="code-injection"
            testId="code-injection"
            title="Code injection"
        >
            {isOpen && <CodeInjectionDialog onClose={() => setIsOpen(false)} />}
        </SettingGroup>
    );
}
