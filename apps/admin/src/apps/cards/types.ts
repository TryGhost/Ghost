import type { CardProperties, CardRenderOutput, CardSite } from '@tryghost/app-contracts/cards';

/**
 * One card an installed app adds to the editor, as Koenig sees it. The origins include the site's
 * own hosts, so files uploaded through Ghost show in a card's snapshot without the app declaring
 * them.
 */
export interface AppCardDefinition {
  appId: string;
  appName: string;
  name: string;
  label: string;
  icon?: string;
  keywords?: string[];
  accentColor: string;
  hasSettings: boolean;
  imageOrigins: string[];
  mediaOrigins: string[];
}

/** A settings panel running in its sandbox, which Koenig draws from `receiver`. */
export interface AppCardSettingsSession {
  /** remote-dom's `RemoteReceiver`, which Koenig renders with its own controls. */
  receiver: unknown;
  propertiesChanged(properties: CardProperties): void;
  dispose(): void;
}

export interface OpenAppCardSettingsOptions {
  appId: string;
  card: string;
  properties: CardProperties;
  /** Ghost renders the card with the patch applied, and saves both together. */
  propose: (patch: CardProperties) => Promise<void>;
  /** Stores an image the panel made, with the editor's own uploader. */
  uploadImage: (file: File) => Promise<{ url: string }>;
}

/**
 * The apps' cards, as the editor's `cardConfig.appCards`. Only active installations' cards are
 * listed; a saved card that isn't shows as unavailable, with its data kept.
 */
export interface AppCardsConfig {
  cards: AppCardDefinition[];
  definition(appId: string, card: string): AppCardDefinition | undefined;
  render(appId: string, card: string, properties: CardProperties): Promise<CardRenderOutput>;
  openSettings(options: OpenAppCardSettingsOptions): Promise<AppCardSettingsSession | null>;
}

export type { CardProperties, CardRenderOutput, CardSite };
