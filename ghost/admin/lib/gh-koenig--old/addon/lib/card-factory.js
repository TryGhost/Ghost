/* eslint-disable camelcase */
import Ember from 'ember';
import EmberObject from '@ember/object';
import {copy} from '@ember/object/internals';

const {uuid} = Ember;

// returns a create card factory that takes a generic mobiledoc card and adds a ghost specific wrapper around it.
// it also provides helper functionality for Ember based cards.

export default function createCardFactory(toolbar) {
    let self = this;

    function createCard(cardObject) {
        // if we have an array of cards then we convert them one by one.
        if (cardObject instanceof Array) {
            return cardObject.map(card => createCard(card));
        }

        // an ember card doesn't need a render or edit method
        if (!cardObject.name || (!cardObject.willRender && cardObject.genus !== 'ember')) {
            throw new Error('A card must have a name and willRender method');
        }

        cardObject.render = ({env, options, payload: _payload}) => {
            // setupUI({env, options, payload});

            // TODO: setup non ember UI

            let payload = copy(_payload);
            payload.card_name = env.name;
            if (cardObject.genus === 'ember') {
                let card = setupEmberCard({env, options, payload}, 'render');
                let div = document.createElement('div');
                div.id = card.id;
                div.className = 'gh-card-holder';
                return div;
            }
            return cardObject.willRender({env, options, payload});
        };

        cardObject.edit = ({env, options, payload: _payload}) => {
            // setupUI({env, options, payload});
            let payload = copy(_payload);
            payload.card_name = env.name;
            if (cardObject.genus === 'ember') {
                let card = setupEmberCard({env, options, payload});
                let div = document.createElement('div');
                div.id = card.id;
                return div;
            }
            if (cardObject.hasOwnProperty('willRender')) {
                return cardObject.willEdit({env, options, payload, toolbar});
            } else {
                return cardObject.willRender({env, options, payload, toolbar});
            }
            // do handle and delete stuff
        };

        cardObject.type = 'dom';

        cardObject.didPlace = () => {

        };

        function setupEmberCard({env, options, payload}) {
            let id = `GHOST_CARD_${uuid()}`;
            let newlyCreated;
            if (payload.newlyCreated) {
                newlyCreated = true;
                delete payload.newlyCreated;
                env.save(payload, false);
            }

            let card = EmberObject.create({
                id,
                env,
                options,
                payload,
                card: cardObject,
                newlyCreated
            });

            self.emberCards.pushObject(card);

            env.onTeardown(() => {
                self.emberCards.removeObject(card);
            });

            return card;
        }

        return cardObject;
        // self.editor.cards.push(cardObject);
    }

    // then return the card factory so new cards can be made at runtime
    return createCard;
}
