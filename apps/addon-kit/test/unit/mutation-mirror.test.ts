import {describe, expect, it} from 'vitest';
import {RemoteReceiver, type RemoteReceiverNode, type RemoteReceiverText} from '@remote-dom/core/receivers';
import {GhostMutationMirror} from '../../src/addon/mutation-mirror.ts';

/**
 * Replays the mirror's emitted mutations into a real RemoteReceiver and
 * asserts the receiver's tree converges to the live DOM. The replacement
 * scenario (insert new children, then remove the old ones — what Preact does
 * on a conditional re-render) is the case remote-dom's own observer
 * mis-indexes, leaving stale nodes on the host.
 */

function tick(): Promise<void> {
    // MutationObserver callbacks run as microtasks; one await flushes them.
    return Promise.resolve();
}

function setup() {
    const receiver = new RemoteReceiver();
    const mirror = new GhostMutationMirror(receiver.connection);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mirror.observe(root);
    return {receiver, mirror, root};
}

function receivedShape(nodes: readonly RemoteReceiverNode[]): unknown[] {
    return nodes.map((node) => {
        if ('element' in node) {
            return {element: node.element, children: receivedShape(node.children)};
        }
        return {text: (node as RemoteReceiverText).data};
    });
}

function domShape(node: Node): unknown[] {
    return Array.from(node.childNodes).map((child) => {
        if (child instanceof Element) {
            return {element: child.localName, children: domShape(child)};
        }
        return {text: child.textContent};
    });
}

function el(tag: string, ...children: (Node | string)[]): HTMLElement {
    const element = document.createElement(tag);
    element.append(...children);
    return element;
}

describe('GhostMutationMirror', function () {
    it('mirrors initial children and simple appends', async function () {
        const {receiver, root} = setup();

        root.append(el('section', 'one'), el('article', 'two'));
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
    });

    it('converges on insert-then-remove subtree replacement', async function () {
        const {receiver, root} = setup();

        const oldA = el('p', 'empty state');
        const oldB = el('button', 'Run first crawl');
        root.append(oldA, oldB);
        await tick();

        // The Preact replacement pattern: new children inserted before the
        // old ones are removed, all within one observer batch.
        root.insertBefore(el('h2', 'report'), oldA);
        root.insertBefore(el('ul', el('li', 'issue 1'), el('li', 'issue 2')), oldA);
        root.removeChild(oldA);
        root.removeChild(oldB);
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
        expect(receiver.root.children).toHaveLength(2);
    });

    it('converges on repeated back-and-forth replacement', async function () {
        const {receiver, root} = setup();

        for (let round = 0; round < 3; round++) {
            const promo = el('p', `empty ${round}`);
            root.append(promo);
            await tick();
            root.insertBefore(el('div', el('span', `report ${round}`)), promo);
            root.removeChild(promo);
            await tick();
            root.replaceChildren();
            await tick();
        }
        root.append(el('footer', 'done'));
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
    });

    it('mirrors nested mutations inside an existing subtree', async function () {
        const {receiver, root} = setup();

        const list = el('ul', el('li', 'a'), el('li', 'b'));
        root.append(list);
        await tick();

        list.insertBefore(el('li', 'c'), list.firstChild);
        list.removeChild(list.childNodes[1]);
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
    });

    it('mirrors text updates via Text.data writes', async function () {
        const {receiver, root} = setup();

        const label = el('span', 'Last crawled just now');
        root.append(label);
        await tick();

        (label.firstChild as Text).data = 'Last crawled 5m ago';
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
    });

    it('handles nodes inserted and removed within one batch', async function () {
        const {receiver, root} = setup();

        const ephemeral = el('p', 'never seen');
        root.append(ephemeral);
        root.removeChild(ephemeral);
        root.append(el('p', 'kept'));
        await tick();

        expect(receivedShape(receiver.root.children)).toEqual(domShape(root));
        expect(receiver.root.children).toHaveLength(1);
    });
});
