import {
    ADD_CARD_HOOK,
    REMOVE_CARD_HOOK
} from '../components/koenig-editor';

const RENDER_TYPE = 'dom';

function renderFallback(doc) {
    let element = doc.createElement('div');
    let text = doc.createTextNode('[placeholder for Ember component card]');
    element.appendChild(text);
    return element;
}

// sets up boilerplate for an Ember component card
export default function createComponentCard(name, doc = window.document) {
    return {
        name,
        type: RENDER_TYPE,

        // Called when the card is added to a mobiledoc document.
        // The `cardArg.options` object contains the methods that were set up
        // on the `cardOptions` property of the editor in `{{koenig-editor}}`,
        // by calling those hooks we set up everything needed for rendering
        // ember components as cards
        render(cardArg) {
            let {env, options} = cardArg;
            if (!options[ADD_CARD_HOOK]) {
                return renderFallback(doc);
            }

            let {card, element} = options[ADD_CARD_HOOK](cardArg);
            let {onTeardown} = env;

            onTeardown(() => options[REMOVE_CARD_HOOK](card));

            return element;
        }
    };
}
