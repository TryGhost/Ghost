import type { CardSurface } from '@tryghost/app-contracts';
import type { CardSite } from '@tryghost/app-contracts/cards';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { fetchCardBundle, openCardSettings, renderCard } from './card-runtime';
import type { AppCardDefinition, AppCardsConfig } from './types';

export interface AppCardsConfigSources {
  installations: AppInstallation[];
  site: CardSite;
  /** The site's own hosts, where files uploaded through Ghost live. */
  siteOrigins: string[];
  /** Reads a bundle's source; a seam for tests. */
  fetchBundle?: (url: string) => Promise<string>;
}

interface InstalledCard {
  definition: AppCardDefinition;
  surface: CardSurface;
}

const keyOf = (appId: string, card: string) => `${appId}\u0000${card}`;

function cardsOf(installation: AppInstallation, siteOrigins: string[]): InstalledCard[] {
  const { manifest } = installation;
  return manifest.surfaces.flatMap((surface) => {
    if (surface.type !== 'card') {
      return [];
    }
    return [
      {
        surface,
        definition: {
          appId: manifest.id,
          appName: manifest.name,
          name: surface.name,
          label: surface.label,
          icon: surface.icon,
          keywords: surface.keywords,
          accentColor: manifest.accent_color,
          hasSettings: Boolean(surface.settings),
          imageOrigins: [...siteOrigins, ...(surface.image_origins ?? [])],
          mediaOrigins: [...siteOrigins, ...(surface.media_origins ?? [])],
        },
      },
    ];
  });
}

/**
 * The editor's view of the apps' cards: the cards active installations declare, and the calls that
 * render them and open their settings in sandboxes. A suspended or uninstalled app's cards aren't
 * listed, so the editor shows its saved cards as unavailable and keeps their data.
 */
export function buildAppCardsConfig({
  installations,
  site,
  siteOrigins,
  fetchBundle = fetchCardBundle,
}: AppCardsConfigSources): AppCardsConfig {
  const installed = new Map<string, InstalledCard>();
  for (const installation of installations) {
    if (installation.status !== 'active') {
      continue;
    }
    for (const card of cardsOf(installation, siteOrigins)) {
      installed.set(keyOf(card.definition.appId, card.definition.name), card);
    }
  }

  // A bundle serves every card that names it, so it's read once while this config lasts.
  const sources = new Map<string, Promise<string>>();
  const source = (url: string) => {
    let pending = sources.get(url);
    if (!pending) {
      pending = fetchBundle(url);
      pending.catch(() => sources.delete(url));
      sources.set(url, pending);
    }
    return pending;
  };

  const find = (appId: string, card: string) => {
    const found = installed.get(keyOf(appId, card));
    if (!found) {
      throw new Error('This card’s app isn’t installed, or no longer offers it');
    }
    return found;
  };

  return {
    cards: [...installed.values()].map(({ definition }) => definition),
    definition: (appId, card) => installed.get(keyOf(appId, card))?.definition,
    async render(appId, card, properties) {
      const { surface } = find(appId, card);
      return renderCard(await source(surface.render), { card, properties, site });
    },
    async openSettings({ appId, card, properties, propose, uploadImage }) {
      const { surface } = find(appId, card);
      if (!surface.settings) {
        return null;
      }
      return openCardSettings(
        await source(surface.settings),
        surface,
        { card, properties, site },
        { propose, uploadImage },
      );
    },
  };
}
