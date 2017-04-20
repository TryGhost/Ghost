import Component from 'ember-component';
import computed from 'ember-computed';
import run from 'ember-runloop';
import $ from 'jquery';
import layout from '../templates/components/koenig-toolbar';
import cajaSanitizers from '../lib/caja-sanitizers';
import Tools from '../options/default-tools';
import {getPositionFromRange} from '../lib/utils';

export default Component.extend({
    layout,
    classNames: ['gh-toolbar'],
    classNameBindings: ['isVisible', 'isLink', 'tickFullLeft', 'tickHalfLeft', 'tickFullRight', 'tickHalfRight', 'tickAbove', 'isTouch'],
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
        let visibleTools = [];

        this.tools.forEach((tool) => {
            if (tool.type === 'markup') {
                visibleTools.push(tool);
            }
        });
        return visibleTools;
    }),

    toolbarBlocks: computed('tools.@each.selected', function () {
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
        let holder = $(this.get('containerSelector'));
        let isMousedown = false;

        holder.mousedown(() => isMousedown = true);
        holder.mouseup(() => {
            isMousedown = false;
            this.updateToolbarToRange(toolbar, holder, isMousedown);
        });
        editor.cursorDidChange(() => this.updateToolbarToRange(toolbar, holder, isMousedown));
        this.set('hasRendered', true);
    },

    willDestroyElement() {
        this.editor.destroy();
    },

    // update the location of the toolbar and display it if the range is visible.
    updateToolbarToRange(toolbar, holder, isMouseDown) {
        // if there is no cursor:
        let editor = this.get('editor');
        if (!editor.range || editor.range.head.isBlank || isMouseDown) {
            if (!this.get('isLink')) {
                this.set('isVisible', false);
            }
            return;
        }

        // set the active markups and sections
        let sectionTagName = editor.activeSection.tagName === 'li' ? editor.activeSection.parent.tagName : editor.activeSection.tagName;
        this.set('activeTags', editor.activeMarkups.concat([{tagName: sectionTagName}]));

        // if we have a selection, then the toolbar appears just above said selection:
        // unless it's a selection around a single card (firefox bug)
        if (!editor.range.isCollapsed
            && !(editor.range.head.section.isCardSection && editor.range.head.section === editor.range.tail.section)) {
            let position = getPositionFromRange(editor, holder);

            this.set('isVisible', true);
            run.schedule('afterRender', this,
                () => {
                    // if we're in touch mode we just use CSS to display the toolbar.
                    if (this.get('isTouch')) {
                        return;
                    }
                    let width = toolbar.width();
                    let height = toolbar.height();
                    let top = position.top - toolbar.height() - 20;
                    let left = position.left + (position.width / 2) - (width / 2);
                    let right = left + width;
                    let edWidth = holder[0].scrollWidth;

                    if (left < 0) {
                        if (Math.round(left / (width / 4)) === -1) {
                            this.setTickPosition('tickFullLeft');
                        } else {
                            this.setTickPosition('tickHalfLeft');
                        }
                        left = 0;
                    } else if (right > edWidth) {
                        if (Math.round((edWidth - right) / (width / 4)) === -1) {
                            this.setTickPosition('tickFullRight');
                        } else {
                            this.setTickPosition('tickHalfRight');
                        }
                        left = left + (edWidth - right);
                    } else {
                        this.setTickPosition(null);
                    }

                    if (!this.get('isTouch') && top - holder.scrollTop() < 0) {
                        top = top + height + 60;
                        this.set('tickAbove', true);
                    } else {
                        this.set('tickAbove', false);
                    }

                    toolbar.css('top', top);
                    toolbar.css('left', left);
                }
            );

            this.send('closeLink');

            this.tools.forEach((tool) => {
                if (tool.hasOwnProperty('checkElements')) {
                    // if its a list we want to know what type
                    let sectionTagName = editor.activeSection._tagName === 'li' ? editor.activeSection.parent._tagName : editor.activeSection._tagName;
                    tool.checkElements(editor.activeMarkups.concat([{tagName: sectionTagName}]));
                }
            });
        } else {
            if (this.isVisible) {
                this.set('isVisible', false);
                this.send('closeLink');
            }
        }
    },
    // set the location of the 'tick' arrow that appears at the bottom of the toolbar and points out the selection.
    setTickPosition(tickPosition) {
        let positions = ['tickFullLeft', 'tickHalfLeft', 'tickFullRight', 'tickHalfRight'];
        positions.forEach((position) => {
            this.set(position, position === tickPosition);
        });
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

