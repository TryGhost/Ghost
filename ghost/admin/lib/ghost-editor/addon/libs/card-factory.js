import Ember from 'ember';

// returns a create card factory that takes a generic mobiledoc card and adds a ghost specific wrapper around it.
// it also provides helper functionality for Ember based cards.

export default function createCardFactory(toolbar) {
    let self = this;

    function createCard(card_object) {
        // if we have an array of cards then we convert them one by one.
        if (card_object instanceof Array) {
            return card_object.map(card => createCard(card));
        }

        // an ember card doesn't need a render or edit method
        if (!card_object.name || (!card_object.willRender && card_object.genus !== 'ember')) {
            throw new Error("A card must have a name and willRender method");
        }

        card_object.render = ({env, options, payload: _payload}) => {

            //setupUI({env, options, payload});

            // todo setup non ember UI

            let payload = Ember.copy(_payload);
            payload.card_name = env.name;
            if (card_object.genus === 'ember') {
                let card = setupEmberCard({env, options, payload}, "render");
                let div = document.createElement('div');
                div.id = card.id;
                return div;
            }
            return card_object.willRender({env, options, payload});
        };

        card_object.edit = ({env, options, payload: _payload}) => {

            //setupUI({env, options, payload});
            let payload = Ember.copy(_payload);
            payload.card_name = env.name;
            if (card_object.genus === 'ember') {
                let card = setupEmberCard({env, options, payload});
                let div = document.createElement('div');
                div.id = card.id;
                return div;
            }
            if (card_object.hasOwnProperty('willRender')) {
                return card_object.willEdit({env, options, payload, toolbar});
            } else {
                return card_object.willRender({env, options, payload, toolbar});
            }
            //do handle and delete stuff
        };

        card_object.type = 'dom';

        card_object.didPlace = () => {

        };

        function setupEmberCard({env, options, payload}) {
            const id = "GHOST_CARD_" + Ember.uuid();
            let card = Ember.Object.create({
                id,
                env,
                options,
                payload,
                card: card_object,
            });

            self.emberCards.pushObject(card);

            env.onTeardown(() => {
                self.emberCards.removeObject(card);
            });

            return card;
        }

        return card_object;
        // self.editor.cards.push(card_object);
    }

    // then return the card factory so new cards can be made at runtime
    return createCard;
}
