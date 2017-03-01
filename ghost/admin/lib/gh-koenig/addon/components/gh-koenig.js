import Ember from 'ember';
import layout from '../templates/components/gh-koenig';
import Mobiledoc from 'mobiledoc-kit';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import createCardFactory from '../libs/card-factory';
import defaultCommands from '../options/default-commands';
import editorCards  from '../cards/index';
//import { VALID_MARKUP_SECTION_TAGNAMES } from 'mobiledoc-kit/models/markup-section'; //the block elements supported by mobile-doc



export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    atoms: [],
    markups: [],
    cards: [],
    sections: []
};

export default Ember.Component.extend({
    layout,
    classNames: ['editor-holder'],
    emberCards: Ember.A([]),
    init() {
        this._super(...arguments);
        this.container = document.querySelector(".gh-editor-container")[0];

        let mobiledoc = this.get('value') || BLANK_DOC;
        let userCards = this.get('cards') || [];

        if (typeof mobiledoc === "string") {
            mobiledoc = JSON.parse(mobiledoc);
        }

        //if the doc is cached then the editor is loaded and we don't need to continue.
        if (this._cached_doc && this._cached_doc === mobiledoc) {
            return;
        }


        let createCard = createCardFactory.apply(this, {}); //need to pass the toolbar

        const options = {
            mobiledoc: mobiledoc,
            //temp
            cards: createCard(editorCards.concat(userCards)),
            atoms: [{
                name: 'soft-return',
                type: 'dom',
                render() {
                    return document.createElement('br');
                }
            }],
            spellcheck: true,
            autofocus: this.get('shouldFocusEditor'),
            placeholder: 'Click here to start ...'
        };
        this.editor = new Mobiledoc.Editor(options);
    },
    willRender() {
        if(this._rendered) {
            return;
        }
        let editor =this.editor;


        editor.willRender(() => {
            //console.log(Ember.run.currentRunLoop);
            //if (!Ember.run.currentRunLoop) {
              //  this._startedRunLoop = true;
              //  Ember.run.begin();
            //}
        });

        editor.didRender(() => {

            this.sendAction('loaded', editor);
                //Ember.run.end();


        });
        editor.postDidChange(()=> {
            Ember.run.join(() => {
                //store a cache of the local doc so that we don't need to reinitialise it.
                this._cached_doc = editor.serialize(MOBILEDOC_VERSION);
                this.sendAction('onChange', this._cached_doc);
                if (this._cached_doc !== BLANK_DOC && !this._firstChange) {
                    this._firstChange = true;
                    this.sendAction('onFirstChange', this._cached_doc);
                }
            });
        });

    },
    didRender() {

        if(this._rendered) {
            return;
        }
        let editorDom = this.$('.surface')[0];
        this.domContainer = editorDom.parentNode.parentNode.parentNode.parentNode; // nasty nasty nasty.
        this.editor.render(editorDom);
        this._rendered = true;

        window.editor = this.editor;
        defaultCommands(this.editor); // initialise the custom text handlers for MD, etc.
        // shouldFocusEditor is only true when transitioning from new to edit, otherwise it's false or undefined.
        // therefore, if it's true it's after the first lot of content is entered and we expect the caret to be at the
        // end of the document.
        if (this.get('shouldFocusEditor')) {
            var range = document.createRange();
            range.selectNodeContents(this.editor.element);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            this.editor._ensureFocus();
        }

        this.editor.cursorDidChange(() => this.cursorMoved());

    },
    // drag and drop images onto the editor
    drop(event) {
        if(event.dataTransfer.files.length) {
            event.preventDefault();
            for (let i = 0; i < event.dataTransfer.files.length; i++) {
                let file = [event.dataTransfer.files[i]];
                this.editor.insertCard('image-card', {pos: 'top', file});
            }
        }
    },

    // makes sure the cursor is on screen.
    cursorMoved() {
        const scrollBuffer = 33; // the extra buffer to scroll.
        const range = window.getSelection().getRangeAt(0); // get the actual range within the DOM.
        const position =  range.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        if(position.bottom > windowHeight ) {
            this.domContainer.scrollTop += position.bottom - windowHeight + scrollBuffer;
        } else if(position.top < 0) {
            this.domContainer.scrollTop += position.top - scrollBuffer;
        }
    },

    willDestroy() {
        this.editor.destroy();
    }

});


