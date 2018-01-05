import $ from 'jquery';
import Ember from 'ember';
import wait from 'ember-test-helpers/wait';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import {TESTING_EXPANDO_PROPERTY} from 'gh-koenig/components/gh-koenig';
import {find, findWithAssert, waitUntil} from 'ember-native-dom-helpers';
import {run} from '@ember/runloop';

export const EMPTY_DOC = {
    version: MOBILEDOC_VERSION,
    markups: [],
    atoms: [],
    cards: [],
    sections: []
};

// traverse up the node tree looking for an editor instance
export function findEditor(element) {
    if (!element) {
        // TODO: get the selector from the editor component
        element = findWithAssert('.gh-koenig-container');
    }

    if (typeof element === 'string') {
        element = findWithAssert(element);
    }

    do {
        if (element[TESTING_EXPANDO_PROPERTY]) {
            return element[TESTING_EXPANDO_PROPERTY];
        }
        element = element.parentNode;
    } while (!!element); // eslint-disable-line

    throw new Error('Unable to find gh-koenig editor from element');
}

export function focusEditor(element) {
    let editor = findEditor(element);
    run(() => editor.element.focus());
    return (window.wait || wait);
}

// polls the title until it's started.
export function titleRendered() {
    return Ember.Test.promise(function (resolve) { // eslint-disable-line
        function checkTitle() {
            let title = $('#koenig-title-input div');
            if (title[0]) {
                return resolve();
            } else {
                window.requestAnimationFrame(checkTitle);
            }
        }
        checkTitle();
    });
}

// replaces the title text content with HTML and returns once the HTML has been placed.
// takes into account converting to plaintext.
export function replaceTitleHTML(HTML) {
    let el = findWithAssert('#koenig-title-input div');
    run(() => el.innerHTML = HTML);
    return (window.wait || wait)();
}

// simulates text inputs into the editor, unfortunately the Ember helper functions
// don't work on content editable so we have to manipuate the text input event manager
// in mobiledoc-kit directly. This is a private API.
export function inputText(editor, text) {
    run(() => {
        editor._eventManager._textInputHandler.handle(text);
    });
}

// inputs text and waits for the editor to modify the dom with the desired result or timesout.
export function testEditorInput(input, output, expect) {
    let editor = findEditor();
    editor.element.focus(); // for some reason the editor doesn't work until it's focused when run in ghost-admin.
    return Ember.Test.promise(function (resolve, reject) { // eslint-disable-line
        let lastRender = '';
        let isRejected = false;
        let rejectTimeout = window.setTimeout(() => {
            expect(lastRender).to.equal(output); // we know this is false but include it for the output.
            reject(lastRender);
            isRejected = true;
        }, 500);
        editor.didRender(() => {
            lastRender = editor.element.innerHTML;
            if (editor.element.innerHTML === output && !isRejected) {
                window.clearTimeout(rejectTimeout);
                expect(lastRender).to.equal(output); // we know this is true but include it for the output.
                return resolve(lastRender);
            }
        });
        inputText(editor, input);
    });
}

export function testEditorInputTimeout(input) {
    let editor = findEditor();
    editor.element.focus();
    return Ember.Test.promise(function (resolve, reject) { // eslint-disable-line
        window.setTimeout(() => {
            resolve(editor.element.innerHTML);
        }, 300);

        inputText(editor, input);
    });
}

export function waitForRender(selector) {
    return waitUntil(() => find(selector));
}
