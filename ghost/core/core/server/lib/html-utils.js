const {parseDocument} = require('htmlparser2');
const {selectAll} = require('css-select');
const {removeElement, textContent, getChildren} = require('domutils');
const render = require('dom-serializer').default;

/**
 * Lightweight HTML manipulation utility that replaces cheerio.
 * Uses the same underlying packages (htmlparser2, css-select, domutils, dom-serializer)
 * but without the full jQuery-like wrapper, avoiding version conflicts with juice.
 *
 * Usage:
 *   const {load} = require('./lib/html-utils');
 *   const $ = load(html);
 *   $('a').each((i, el) => { ... });
 *   const result = $.html();
 */

class WrappedSet {
    constructor(elements, root) {
        this._elements = Array.isArray(elements) ? elements : [elements];
        this._root = root;
        this.length = this._elements.length;
        // Support numeric indexing (e.g. $('a')[0])
        for (let i = 0; i < this._elements.length; i++) {
            this[i] = this._elements[i];
        }
    }

    get(index) {
        if (index === undefined) {
            return this._elements;
        }
        return this._elements[index];
    }

    toArray() {
        return this._elements.slice();
    }

    first() {
        return new WrappedSet(this._elements.length ? [this._elements[0]] : [], this._root);
    }

    each(fn) {
        this._elements.forEach((el, i) => {
            fn(i, el);
        });
        return this;
    }

    map(fn) {
        return this._elements.map((el, i) => fn(i, el));
    }

    attr(name, value) {
        if (value === undefined) {
            // Getter
            const el = this._elements[0];
            if (!el || !el.attribs) {
                return undefined;
            }
            return el.attribs[name];
        }
        // Setter
        for (const el of this._elements) {
            if (el.attribs) {
                el.attribs[name] = value;
            }
        }
        return this;
    }

    removeAttr(name) {
        for (const el of this._elements) {
            if (el.attribs) {
                delete el.attribs[name];
            }
        }
        return this;
    }

    remove() {
        for (const el of this._elements) {
            removeElement(el);
        }
        return this;
    }

    addClass(className) {
        for (const el of this._elements) {
            if (el.attribs) {
                const existing = el.attribs.class || '';
                const classes = existing ? existing.split(/\s+/) : [];
                if (!classes.includes(className)) {
                    classes.push(className);
                }
                el.attribs.class = classes.join(' ');
            }
        }
        return this;
    }

    text() {
        if (this._elements.length === 0) {
            return '';
        }
        return this._elements.map(el => textContent(el)).join('');
    }

    html(content) {
        if (content === undefined) {
            // Get inner HTML
            if (this._elements.length === 0) {
                return '';
            }
            const el = this._elements[0];
            const children = getChildren(el);
            return render(children, {decodeEntities: false});
        }
        // Set inner HTML
        for (const el of this._elements) {
            const parsed = parseDocument(content, {decodeEntities: false});
            const newChildren = getChildren(parsed);
            el.children = newChildren;
            for (let j = 0; j < newChildren.length; j++) {
                newChildren[j].parent = el;
                newChildren[j].prev = j > 0 ? newChildren[j - 1] : null;
                newChildren[j].next = j < newChildren.length - 1 ? newChildren[j + 1] : null;
            }
        }
        return this;
    }

    find(selector) {
        const results = [];
        for (const el of this._elements) {
            results.push(...selectAll(selector, el));
        }
        return new WrappedSet(results, this._root);
    }

    before(htmlStr) {
        for (const el of this._elements) {
            const parent = el.parent;
            if (!parent) {
                continue;
            }

            const parsed = parseDocument(htmlStr, {decodeEntities: false});
            const newNodes = getChildren(parsed);
            if (newNodes.length === 0) {
                continue;
            }

            const idx = parent.children.indexOf(el);
            parent.children.splice(idx, 0, ...newNodes);

            // Rebuild prev/next links only for the affected window
            const end = Math.min(parent.children.length, idx + newNodes.length + 1);
            for (let i = Math.max(0, idx - 1); i < end; i++) {
                const node = parent.children[i];
                node.parent = parent;
                node.prev = i > 0 ? parent.children[i - 1] : null;
                node.next = i < parent.children.length - 1 ? parent.children[i + 1] : null;
            }
        }
        return this;
    }
}

/**
 * Load an HTML string and return a query function.
 * @param {string} html
 * @returns {Function & {html: Function}} A jQuery-like query function with .html() method
 */
function load(html) {
    const root = parseDocument(html, {decodeEntities: false});

    function $(selectorOrElement) {
        if (typeof selectorOrElement === 'string') {
            const elements = selectAll(selectorOrElement, root);
            return new WrappedSet(elements, root);
        }
        if (selectorOrElement === null || selectorOrElement === undefined) {
            return new WrappedSet([], root);
        }
        if (Array.isArray(selectorOrElement)) {
            return new WrappedSet(selectorOrElement, root);
        }
        // Wrap a raw element
        return new WrappedSet(selectorOrElement, root);
    }

    $.html = function () {
        return render(root, {decodeEntities: false});
    };

    $.text = function () {
        return textContent(root);
    };

    $.root = root;

    return $;
}

/**
 * Query HTML without loading - equivalent to cheerio(selector, html)
 * @param {string} selector
 * @param {string} html
 * @returns {WrappedSet}
 */
function select(selector, html) {
    const root = parseDocument(html, {decodeEntities: false});
    const elements = selectAll(selector, root);
    return new WrappedSet(elements, root);
}

module.exports = {load, select};
