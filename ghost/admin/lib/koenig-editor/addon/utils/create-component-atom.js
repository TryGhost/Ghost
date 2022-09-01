import {
    ADD_ATOM_HOOK,
    REMOVE_ATOM_HOOK
} from '../components/koenig-editor';

const RENDER_TYPE = 'dom';

function renderFallback(doc) {
    let element = doc.createElement('span');
    let text = doc.createTextNode('[placeholder for Ember component atom]');
    element.appendChild(text);
    return element;
}

// sets up boilderplate for an Ember component atom
export default function createComponentAtom(name, doc = window.document) {
    return {
        name,
        type: RENDER_TYPE,

        // Called when the atom is added to a mobiledoc document.
        render(atomArgs) {
            const {env, options} = atomArgs;

            if (!options[ADD_ATOM_HOOK]) {
                return renderFallback(doc);
            }

            const {atom, element} = options[ADD_ATOM_HOOK](atomArgs);

            env.onTeardown(() => options[REMOVE_ATOM_HOOK](atom));

            return element;
        }
    };
}
