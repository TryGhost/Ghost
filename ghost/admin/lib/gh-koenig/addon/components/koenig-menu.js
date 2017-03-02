import Ember from 'ember';
import Tools from '../options/default-tools';
import layout from '../templates/components/koenig-menu';

export default Ember.Component.extend({
    layout,
    range: null,
    menuSelectedItem: 0,
    toolsLength:0,
    selectedTool:null,
    isActive: false,
    isInputting: false,
    isSetup: false,
    toolbar: Ember.computed(function () {
        let tools = [ ];
        let match = (this.query || "").trim().toLowerCase();
        let i = 0;
        // todo cache active tools so we don't need to loop through them on selection change.
        this.tools.forEach((tool) => {

            if ((tool.type === 'block' || tool.type === 'card') && (tool.label.toLowerCase().startsWith(match) || tool.name.toLowerCase().startsWith(match))) {

                let t = {
                    label : tool.label,
                    name: tool.name,
                    icon: tool.icon,
                    selected: i===this.menuSelectedItem,
                    onClick: tool.onClick
                };
                if(i === this.menuSelectedItem) {
                    this.set('selectedTool', t);
                }

                tools.push(t);
                i++;
            }
        });
        this.set('toolsLength', i);
        if(this.menuSelectedItem > this.toolsLength) {
            this.set('menuSelectedItem', this.toolsLength-1);
           // this.propertyDidChange('toolbar');
        }

        if(tools.length <  1) {
            this.isActive = false;
            this.$('.koenig-menu').hide();
        }
        return tools;
    }),

    init() {
        this._super(...arguments);
        this.tools =new Tools(this.get('editor'), this);
        this.iconURL = this.get('assetPath') + '/tools/';

        this.editor.cursorDidChange(this.cursorChange.bind(this));
        let self = this;
        this.editor.onTextInput(
        {
            name: 'slash_menu',
            text: '/',
            run(editor) {
                self.open(editor);
            }
        });
    },
    willDestroy() {
        this.editor.destroy();
    },
    cursorChange() {
        if(!this.editor.range.isCollapsed || this.editor.range.head.section !== this._node || this.editor.range.head.offset < 1 || !this.editor.range.head.section) {
            this.close();
        }
        
        if(this.isActive && this.isInputting) {
            this.query = this.editor.range.head.section.text.substring(this._offset, this.editor.range.head.offset);
            this.set('range', {
                section: this._node,
                startOffset: this._offset,
                endOffset: this.editor.range.head.offset
            });
            this.propertyDidChange('toolbar');
        }


    },
    didRender( ) {
        if(!this.isSetup) {
            this.$('.koenig-menu-button').onClick = () => {alert("CLICK")};
            this.isSetup = true;
        }
    },
    /**
     * 
     * @param {*} editor 
     * @param {*} notInputting is true if the user isn't typing to filter, this occurs
     * if the menu is oppened via pressing + rather than typing in /
     */
    open(editor, notInputting) {
        let self = this;
        let $this = this.$('.koenig-menu');
        let $editor = Ember.$('.gh-editor-container');

        this._node = editor.range.head.section;
        this._offset = editor.range.head.offset;
        this.isActive = true;
        this.isInputting = !notInputting;
        this.cursorChange();
        let range = window.getSelection().getRangeAt(0); // get the actual range within the DOM.

        let position =  range.getBoundingClientRect();
        let edOffset = $editor.offset();

        $this.show();

        Ember.run.schedule('afterRender', this,
            () => {
                $this.css('top', position.top + $editor.scrollTop() - edOffset.top + 20); //- edOffset.top+10
                $this.css('left', position.left + (position.width / 2) + $editor.scrollLeft() - edOffset.left );
            }
        );

        this.query="";
        this.propertyDidChange('toolbar');


        const downKeyCommand = {
            str: 'DOWN',
            _ghostName: 'slashdown',
            run() {
                let item = self.get('menuSelectedItem');
                if(item < self.get('toolsLength')-1) {
                    self.set('menuSelectedItem', item + 1);
                    self.propertyDidChange('toolbar');
                }
            }
        };
        editor.registerKeyCommand(downKeyCommand);

        const upKeyCommand = {
            str: 'UP',
            _ghostName: 'slashup',
            run() {
                let item = self.get('menuSelectedItem');
                if(item > 0) {
                    self.set('menuSelectedItem', item - 1);
                    self.propertyDidChange('toolbar');
                }
            }
        };
        editor.registerKeyCommand(upKeyCommand);

        const enterKeyCommand = {
            str: 'ENTER',
            _ghostName: 'slashdown',
            run(postEditor) {

                let range = postEditor.range;

                range.head.offset = self._offset - 1;
                postEditor.deleteRange(range);
                self.get('selectedTool').onClick(self.get('editor'));
                self.close();
            }
        };
        editor.registerKeyCommand(enterKeyCommand);

        const escapeKeyCommand = {
            str: 'ESC',
            _ghostName: 'slashesc',
            run() {
               self.close();
            }
        };
        editor.registerKeyCommand(escapeKeyCommand);
    },
    close() {
        this.isActive = false;
        this.isInputting = false;
        this.$('.koenig-menu').hide();
        // note: below is using a mobiledoc Private API.
        // there is no way to unregister a keycommand when it's registered so we have to remove it ourselves.
        for( let i = this.editor._keyCommands.length-1; i > -1; i--) {
            let keyCommand = this.editor._keyCommands[i];

            if(keyCommand._ghostName === 'slashdown' || keyCommand._ghostName === 'slashup' || keyCommand._ghostName === 'slashenter'|| keyCommand._ghostName === 'slashesc') {
                this.editor._keyCommands.splice(i,1);
            }
        }
        return;
    }
});
