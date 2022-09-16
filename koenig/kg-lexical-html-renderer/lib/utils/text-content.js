const {$isLinkNode} = require('@lexical/link');
const {$isTextNode} = require('lexical');

const FORMAT_TAG_MAP = {
    bold: 'STRONG',
    italic: 'EM',
    strikethrough: 'S',
    underline: 'U',
    code: 'CODE',
    subscript: 'SUB',
    superscript: 'SUP'
};

// Builds and renders text content, useful to ensure proper format tag opening/closing
// and html escaping
class TextContent {
    constructor() {
        const jsdom = require('jsdom');
        const {JSDOM} = jsdom;

        this.dom = new JSDOM();
        this.doc = this.dom.window.document;
        this.root = this.doc.createElement('div');
        this.currentNode = this.root;
        this.currentFormats = [];
    }

    addTextNode(node/*, parentNode, options*/) {
        if (!$isTextNode(node)) {
            return;
        }

        // close any unused format tags for this node
        this.currentFormats.forEach((format) => {
            if (!node.hasFormat(format)) {
                this.currentFormats.shift();
                this.currentNode = this.currentFormats[0]
                    ? this.currentNode.closest(FORMAT_TAG_MAP[this.currentFormats[0]])
                    : this.root;
            }
        });

        // insert any queued line breaks
        this._insertQueuedLineBreak();

        // add any new format tags for this node
        Object.entries(FORMAT_TAG_MAP).forEach(([format, tag]) => {
            if (node.hasFormat(format)) {
                // prevent adding extra wrapping tags if we already have this format
                if (!this.currentFormats.includes(format)) {
                    const formatTag = this.doc.createElement(tag);
                    this.currentNode.append(formatTag);
                    this.currentNode = formatTag;

                    this.currentFormats.unshift(format);
                }
            }
        });

        // add the actual text content
        this.currentNode.append(node.getTextContent());
    }

    addLineBreak() {
        this.queueLineBreak = true;
    }

    addLinkNode(node, parentNode, exportChildren, options) {
        if (!$isLinkNode(node)) {
            return;
        }

        const a = this.doc.createElement('a');

        a.setAttribute('href', node.getURL());
        a.innerHTML = exportChildren(node, options);

        this.currentNode.append(a);
    }

    isEmpty() {
        return this.root.innerHTML === '';
    }

    render() {
        this._insertQueuedLineBreak();
        return this.root.innerHTML;
    }

    clear() {
        this.root = this.doc.createElement('DIV');
        this.currentNode = this.root;
        this.currentFormats = [];
    }

    _insertQueuedLineBreak() {
        if (this.queueLineBreak) {
            this.currentNode.append(this.doc.createElement('BR'));
            this.queueLineBreak = false;
        }
    }
}

module.exports = TextContent;
