import type { CardSurface } from '@tryghost/app-contracts';
import type { Installation } from './codec';

/** A card an installed app declares, as its approved manifest has it. */
export interface InstalledCard {
  appId: string;
  /** Active apps' cards render and go live; suspended apps' cards show their snapshot only. */
  status: 'active' | 'suspended';
  surface: CardSurface;
}

export interface InstalledCards {
  /** The card, if its app is installed and its approved manifest still declares it. */
  find(appId: string, card: string): InstalledCard | undefined;
}

const NONE: InstalledCards = { find: () => undefined };

// A safety net only: every change to an installation clears the cache straight away.
const MAX_AGE_MS = 60_000;

/**
 * The cards of installed apps, read once and kept in memory, since every post Ghost serves
 * with an app card asks. `forget` clears it; the service calls it when the site changes.
 */
export class CardSurfaces {
  private cached: { cards: InstalledCards; at: number } | undefined;
  private reading: Promise<InstalledCards> | undefined;
  // Bumped by `forget()`, so a read that started before a change can't cache what it found.
  private generation = 0;
  private browse: () => Promise<Installation[]>;

  constructor(browse: () => Promise<Installation[]>) {
    this.browse = browse;
  }

  async read(): Promise<InstalledCards> {
    if (this.cached && Date.now() - this.cached.at < MAX_AGE_MS) {
      return this.cached.cards;
    }
    if (!this.reading) {
      const generation = this.generation;
      const reading = this.browse()
        .then((installations) => {
          const cards = indexCards(installations);
          if (generation === this.generation) {
            this.cached = { cards, at: Date.now() };
          }
          return cards;
        })
        .finally(() => {
          if (this.reading === reading) {
            this.reading = undefined;
          }
        });
      this.reading = reading;
    }
    return this.reading;
  }

  forget(): void {
    this.generation += 1;
    this.cached = undefined;
    // Later reads start afresh rather than joining one that may predate the change.
    this.reading = undefined;
  }
}

export function indexCards(installations: Installation[]): InstalledCards {
  const byKey = new Map<string, InstalledCard>();
  for (const installation of installations) {
    if (installation.status !== 'active' && installation.status !== 'suspended') {
      continue;
    }
    for (const surface of installation.manifest.surfaces) {
      if (surface.type === 'card') {
        byKey.set(`${installation.app_id}\u0000${surface.name}`, {
          appId: installation.app_id,
          status: installation.status,
          surface,
        });
      }
    }
  }
  if (byKey.size === 0) {
    return NONE;
  }
  return { find: (appId, card) => byKey.get(`${appId}\u0000${card}`) };
}
