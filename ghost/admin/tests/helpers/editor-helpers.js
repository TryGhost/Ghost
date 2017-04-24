import Ember from 'ember';
import $ from 'jquery';
import run from 'ember-runloop';
import wait from 'ember-test-helpers/wait';
import {findWithAssert} from 'ember-native-dom-helpers';

// polls the editor until it's started.
export function editorRendered() {
    return Ember.Test.promise(function (resolve) { // eslint-disable-line
        function checkEditor() {
            if (window.editor) {
                return resolve();
            } else {
                window.requestAnimationFrame(checkEditor);
            }
        }
        checkEditor();
    });
}

// polls the title until it's started.
export function titleRendered() {
    return Ember.Test.promise(function (resolve) { // eslint-disable-line
        function checkTitle() {
            let title = $('#gh-editor-title div');
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
    let el = findWithAssert('#gh-editor-title div');
    run(() => el.innerHTML = HTML);
    return (window.wait || wait)();
}

// simulates text inputs into the editor, unfortunately the helper Ember helper functions
// don't work on content editable so we have to manipuate the text input event manager
// in mobiledoc-kit directly. This is a private API.
export function inputText(editor, text) {
    editor._eventManager._textInputHandler.handle(text);
}

// inputs text and waits for the editor to modify the dom with the desired result or timesout.
export function testInput(input, output, expect) {
    window.editor.element.focus(); // for some reason the editor doesn't work until it's focused when run in ghost-admin.
    return Ember.Test.promise(function (resolve, reject) { // eslint-disable-line
        let lastRender = '';
        let isRejected = false;
        let rejectTimeout = window.setTimeout(() => {
            expect(lastRender).to.equal(output); // we know this is false but include it for the output.
            reject(lastRender);
            isRejected = true;
        }, 500);
        window.editor.didRender(() => {
            lastRender = window.editor.element.innerHTML;
            if (window.editor.element.innerHTML === output && !isRejected) {
                window.clearTimeout(rejectTimeout);
                expect(lastRender).to.equal(output); // we know this is true but include it for the output.
                return resolve(lastRender);
            }
        });
        inputText(window.editor, input);
    });
}

export function testInputTimeout(input) {
    window.editor.element.focus();
    return Ember.Test.promise(function (resolve, reject) { // eslint-disable-line
        window.setTimeout(() => {
            resolve(window.editor.element.innerHTML);
        }, 300);

        inputText(window.editor, input);
    });
}

export function waitForRender(selector) {
    let isRejected = false;
    return Ember.Test.promise(function (resolve, reject) { // eslint-disable-line
        let rejectTimeout = window.setTimeout(() => {
            reject('element didn\'t render');
            isRejected = true;
        }, 1500);

        function checkIsRendered() {
            if ($(selector)[0] && !isRejected) {
                window.clearTimeout(rejectTimeout);
                return resolve();
            } else {
                window.requestAnimationFrame(checkIsRendered);
            }
        }
        checkIsRendered();
    });
}

export function timeoutPromise(timeout) {
    return Ember.Test.promise(function (resolve) { // eslint-disable-line
        window.setTimeout(() => {
            resolve();
        }, timeout);
    });
}