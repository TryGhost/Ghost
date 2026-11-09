// What the host (Ghost Admin) gives the editor about installed apps' cards, as
// `cardConfig.appCards`. Koenig knows nothing about apps beyond this: the host
// runs the cards' code in sandboxes and hands back what it rendered.

export type AppCardProperties = Record<string, unknown>;

export interface AppCardDefinition {
    appId: string;
    appName: string;
    name: string;
    label: string;
    icon?: string;
    keywords?: string[];
    accentColor: string;
    hasSettings: boolean;
    // origins the card's snapshot may load images and media from, the site's own included
    imageOrigins: string[];
    mediaOrigins: string[];
}

export interface AppCardRenderOutput {
    html: string;
    css: string;
    height: number;
    email_html: string;
    public_properties: string[];
}

export interface AppCardSettingsSession {
    // remote-dom's RemoteReceiver, rendered with Koenig's own controls
    receiver: unknown;
    propertiesChanged: (properties: AppCardProperties) => void;
    dispose: () => void;
}

export interface AppCardsConfig {
    cards: AppCardDefinition[];
    definition: (appId: string, card: string) => AppCardDefinition | undefined;
    render: (appId: string, card: string, properties: AppCardProperties) => Promise<AppCardRenderOutput>;
    openSettings: (options: {
        appId: string;
        card: string;
        properties: AppCardProperties;
        propose: (patch: AppCardProperties) => Promise<void>;
        uploadImage: (file: File) => Promise<{url: string}>;
    }) => Promise<AppCardSettingsSession | null>;
}

// The node fields a render produces, applied together with the properties it came from
export interface AppCardSnapshot {
    html: string;
    css: string;
    height: number;
    emailHtml: string;
    publicProperties: string[];
}

export function snapshotFromOutput(output: AppCardRenderOutput): AppCardSnapshot {
    return {
        html: output.html,
        css: output.css,
        height: output.height,
        emailHtml: output.email_html,
        publicProperties: [...output.public_properties]
    };
}
