import path from 'path';
import { CardFactory } from '@tryghost/kg-card-factory';
import { cards as defaultCards } from '@tryghost/kg-default-cards';
import * as imageTransform from '@tryghost/image-transform';
import config from '../../shared/config';
import adapterManager from '../services/adapter-manager';

let cards: ReturnType<CardFactory['createCard']>[] | null = null;

export const mobiledoc = {
  get blankDocument() {
    return {
      version: '0.3.1',
      ghostVersion: '4.0',
      markups: [],
      atoms: [],
      cards: [],
      sections: [[1, 'p', [[0, [], 0, '']]]],
    };
  },

  get cards() {
    if (!cards) {
      const cardFactory = new CardFactory({
        siteUrl: config.get('url'),
        imageBaseUrl: config.get('urls:image') || '',
        imageOptimization: config.get('imageOptimization'),
        canTransformImage(storagePath: string) {
          const { ext } = path.parse(storagePath);

          // NOTE: the "saveRaw" check is smelly
          return (
            imageTransform.canTransformFiles() &&
            imageTransform.shouldResizeFileExtension(ext) &&
            typeof adapterManager.getAdapter('storage:images').saveRaw === 'function'
          );
        },
      });

      cards = defaultCards.map((card) => {
        return cardFactory.createCard(card);
      });
    }

    return cards;
  },

  // allow config changes to be picked up - useful in tests
  reload() {
    cards = null;
  },
};
