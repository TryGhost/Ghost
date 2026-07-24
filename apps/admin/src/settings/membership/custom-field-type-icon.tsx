import { type SVGProps } from "react";
import { LucideIcon } from "@tryghost/shade/utils";
import type { MemberCustomField } from "@tryghost/admin-x-framework/api/member-custom-fields";

/**
 * Type icons for the custom-fields surfaces. Short text keeps the legacy
 * "Aa" glyph (inlined from the old-DS `aa` icon — it draws with an SVG text
 * node, so the row's visible "Aa" stays real text content); the others map
 * to their Lucide equivalents.
 */

function AaIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
            <text fill="currentColor" fontSize="19" fontWeight="600" textAnchor="middle" x="12" y="18.5">Aa</text>
        </svg>
    );
}

export function CustomFieldTypeIcon({ typeId, className }: { typeId: MemberCustomField["type"]; className?: string }) {
    switch (typeId) {
    case "short_text":
        return <AaIcon className={className} />;
    case "long_text":
        return <LucideIcon.Text className={className} />;
    case "address":
        return <LucideIcon.MapPin className={className} />;
    default:
        return <AaIcon className={className} />;
    }
}
