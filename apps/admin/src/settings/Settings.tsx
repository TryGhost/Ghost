import { App } from "@tryghost/admin-x-settings/src/App";
import type { OfficialTheme } from "@tryghost/admin-x-settings/src/components/providers/SettingsAppProvider";
import { createPortal } from "react-dom";

const officialThemes: OfficialTheme[] = [
    {
        name: "Source",
        category: "News",
        previewUrl: "https://source.ghost.io/",
        ref: "default",
        image: "assets/img/themes/Source.png",
        variants: [
            {
                category: "Magazine",
                previewUrl: "https://source-magazine.ghost.io/",
                image: "assets/img/themes/Source-Magazine.png",
            },
            {
                category: "Newsletter",
                previewUrl: "https://source-newsletter.ghost.io/",
                image: "assets/img/themes/Source-Newsletter.png",
            },
        ],
    },
    {
        name: "Casper",
        category: "Blog",
        previewUrl: "https://demo.ghost.io/",
        ref: "default",
        image: "assets/img/themes/Casper.png",
    },
    {
        name: "Headline",
        category: "News",
        url: "https://github.com/TryGhost/Headline",
        previewUrl: "https://headline.ghost.io",
        ref: "TryGhost/Headline",
        image: "assets/img/themes/Headline.png",
    },
    {
        name: "Edition",
        category: "Newsletter",
        url: "https://github.com/TryGhost/Edition",
        previewUrl: "https://edition.ghost.io/",
        ref: "TryGhost/Edition",
        image: "assets/img/themes/Edition.png",
    },
];

const zapierTemplates: [] = [];

export function Settings() {
    return createPortal(
        <div
            className="shade shade-admin"
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
            }}
        >
            <App
                designSystem={{
                    darkMode: false,
                    fetchKoenigLexical: async () => {},
                }}
                officialThemes={officialThemes}
                zapierTemplates={zapierTemplates}
            />
        </div>,
        document.body,
    );
}
