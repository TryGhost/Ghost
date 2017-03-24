import Component from 'ember-component';
import computed from 'ember-computed';
import run from 'ember-runloop';
import $ from 'jquery';
import layout from '../templates/components/koenig-toolbar';
import cajaSanitizers from '../lib/caja-sanitizers';
import Tools from '../options/default-tools';

export default Component.extend({
    layout,
    classNames: ['gh-toolbar'],
    classNameBindings: ['isVisible', 'isLink'],
    isVisible: false,
    tools: [],
    hasRendered: false,
    activeTags: null,
    isLink: computed({
        get() {
            return this._isLink;
        },
        set(_, value) {
            this._isLink = value;
            return this._isLink;
        }
    }),

    toolbar: computed('tools.@each.selected', function () {
        // TODO if a block section other than a primary section is selected then
        // the returned list removes one of the primary sections to compensate,
        // so that there are only ever four primary sections.
        let visibleTools = [];

        this.tools.forEach((tool) => {
            if (tool.type === 'markup') {
                visibleTools.push(tool);
            }
        });
        return visibleTools;
    }),

    toolbarBlocks: computed('tools.@each.selected', function () {
        // TODO if a block section other than a primary section is selected then
        // the returned list removes one of the primary sections to compensate,
        // so that there are only ever four primary sections.
        let visibleTools = [];

        this.tools.forEach((tool) => {
            if (tool.toolbar) {
                visibleTools.push(tool);
            }
        });
        return visibleTools;
    }),

    init() {
        this._super(...arguments);
        this.tools = new Tools(this.get('editor'), this);
        this.iconURL = `${this.get('assetPath')}/tools/`;
    },

    didRender() {
        if (this.get('hasRendered')) {
            return;
        }
        let toolbar = this.$();
        let {editor} = this;
        let $editor = $(this.get('containerSelector')); // TODO - this element is part of ghost-admin, we need to separate them more.
        let isMousedown = false;

        $editor.mousedown(() => isMousedown = true);
        $editor.mouseup(() => {
            isMousedown = false;
            updateToolbarToRange(this, toolbar, $editor, isMousedown);
        });
        editor.cursorDidChange(() => updateToolbarToRange(this, toolbar, $editor, isMousedown));
        this.set('hasRendered', true);
    },

    willDestroyElement() {
        this.editor.destroy();
    },

    actions: {
        linkKeyDown(event) {
            // if escape close link
            if (event.keyCode === 27) {
                this.send('closeLink');
            }
        },

        linkKeyPress(event) {
            // if enter run link
            if (event.keyCode === 13) {
                let url = event.target.value;
                if (!cajaSanitizers.url(url)) {
                    url = `http://${url}`;
                }
                this.send('closeLink');
                this.set('isVisible', false);
                this.editor.run((postEditor) => {
                    let markup = postEditor.builder.createMarkup('a', {href: url});
                    postEditor.addMarkupToRange(this.get('linkRange'), markup);
                });

                this.set('linkRange', null);
                event.stopPropagation();
            }
        },
        doLink(range) {
            // if a link is already selected then we remove the links from within the range.
            let currentLinks = this.get('activeTags').filter((element) => element.tagName === 'a');
            if (currentLinks.length) {
                this.get('editor').run((postEditor) => {
                    currentLinks.forEach((link) => {
                        postEditor.removeMarkupFromRange(range, link);
                    });
                });

                return;
            }
            this.set('isLink', true);
            this.set('linkRange', range);
            run.schedule('afterRender', this,
                () => {
                    this.$('input').focus();
                }
            );
        },
        closeLink() {
            this.set('isLink', false);
        }
    }
});

// update the location of the toolbar and display it if the range is visible.
function updateToolbarToRange(self, $holder, $editor, isMouseDown) {
    // if there is no cursor:
    let {editor} = self;
    if (!editor.range || editor.range.head.isBlank || isMouseDown) {
        if (!self.get('isLink')) {
            self.set('isVisible', false);
        }
        return;
    }

    // set the active markups and sections
    let sectionTagName = editor.activeSection.tagName === 'li' ? editor.activeSection.parent.tagName : editor.activeSection.tagName;
    self.set('activeTags', editor.activeMarkups.concat([{tagName: sectionTagName}]));

    self.propertyWillChange('toolbar');
    self.propertyWillChange('toolbarBlocks');

    if (!editor.range.isCollapsed) {
        // if we have a selection, then the toolbar appears just below said selection:

        let range = window.getSelection().getRangeAt(0); // get the actual range within the DOM.
        let position =  range.getBoundingClientRect();
        let edOffset = $editor.offset();

        self.set('isVisible', true);
        run.schedule('afterRender', this,
            () => {
                $holder.css('top', position.top + $editor.scrollTop() - $holder.height() - 20); // - edOffset.top+10
                $holder.css('left', position.left + (position.width / 2) + $editor.scrollLeft() - edOffset.left - ($holder.width() / 2));
            }
        );

        self.send('closeLink');

        self.tools.forEach((tool) => {
            if (tool.hasOwnProperty('checkElements')) {
                // if its a list we want to know what type
                let sectionTagName = editor.activeSection._tagName === 'li' ? editor.activeSection.parent._tagName : editor.activeSection._tagName;
                tool.checkElements(editor.activeMarkups.concat([{tagName: sectionTagName}]));
            }
        });
    } else {
        if (self.isVisible) {
            self.set('isVisible', false);
            self.send('closeLink');
        }
    }

    self.propertyDidChange('toolbar');
    self.propertyDidChange('toolbarBlocks');
}
